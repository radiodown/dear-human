#include "SampleAssets.hpp"
#include "CloneModelData.hpp"
#define CGLTF_IMPLEMENTATION
#include "../third_party/cgltf/cgltf.h"
#include <memory>
#include <stdexcept>

namespace dh {
namespace {
MeshData loadStatic(const std::filesystem::path& path) {
    cgltf_options options{}; cgltf_data* raw=nullptr;
    if(cgltf_parse_file(&options,path.string().c_str(),&raw)!=cgltf_result_success)
        throw std::runtime_error("Cannot parse sample: "+path.string());
    std::unique_ptr<cgltf_data,decltype(&cgltf_free)> data(raw,cgltf_free);
    if(cgltf_load_buffers(&options,data.get(),path.string().c_str())!=cgltf_result_success ||
       cgltf_validate(data.get())!=cgltf_result_success)
        throw std::runtime_error("Invalid sample buffers: "+path.string());
    MeshData mesh;
    const auto visit=[&](auto&& self,const cgltf_node& node)->void {
        if(node.skin) throw std::runtime_error("Sample importer expects unskinned geometry");
        Mat4 world; cgltf_node_transform_world(&node,world.m.data());
        // Inverse transpose, including nonuniform scale in glTF node transforms.
        const Vec3 a=world.direction({1,0,0}),b=world.direction({0,1,0}),c=world.direction({0,0,1});
        const float det=dot(a,cross(b,c));
        if(std::abs(det)<1e-10f) throw std::runtime_error("Singular sample transform");
        if(node.mesh) for(std::size_t p=0;p<node.mesh->primitives_count;++p) {
            const auto& prim=node.mesh->primitives[p];
            if(prim.type!=cgltf_primitive_type_triangles || prim.targets_count || prim.has_draco_mesh_compression)
                throw std::runtime_error("Unsupported sample primitive");
            const cgltf_accessor *pos=nullptr,*normal=nullptr,*uv=nullptr,*color=nullptr;
            for(std::size_t i=0;i<prim.attributes_count;++i) {
                const auto& attr=prim.attributes[i];
                if(attr.type==cgltf_attribute_type_position) pos=attr.data;
                if(attr.type==cgltf_attribute_type_normal) normal=attr.data;
                if(attr.type==cgltf_attribute_type_texcoord && attr.index==0) uv=attr.data;
                if(attr.type==cgltf_attribute_type_color && attr.index==0) color=attr.data;
            }
            if(!pos || !normal) throw std::runtime_error("Sample requires positions and normals");
            Color base{1,1,1,1}; float metal=0,rough=.75f,mode=0;
            const cgltf_texture_view* texture=nullptr;
            if(prim.material) {
                const auto& mat=*prim.material;
                if(mat.alpha_mode==cgltf_alpha_mode_blend) throw std::runtime_error("Blended sample materials are unsupported");
                const auto& pbr=mat.pbr_metallic_roughness;
                const auto* f=pbr.base_color_factor;
                // Vertex colours in our renderer are sRGB; glTF factors are linear.
                base={std::pow(f[0],1/2.2f),std::pow(f[1],1/2.2f),std::pow(f[2],1/2.2f),f[3]};
                metal=pbr.metallic_factor;rough=pbr.roughness_factor;texture=&pbr.base_color_texture;
                if(texture->texture) {
                    const auto* img=texture->texture->image;
                    const std::string name=img && img->uri?std::filesystem::path(img->uri).filename().string():"";
                    if(name=="T_Hair_1_BaseColor.png") mode=3;
                    else if(name=="T_Hair_2_BaseColor.png") mode=4;
                    else throw std::runtime_error("Unregistered sample texture: "+name);
                    if(!uv || texture->texcoord!=0 || (texture->has_transform && texture->transform.texcoord!=0))
                        throw std::runtime_error("Sample texture requires UV0");
                }
            }
            const auto offset=static_cast<std::uint32_t>(mesh.vertices.size());
            for(std::size_t i=0;i<pos->count;++i) {
                float v[4]{},n[3]{},t[2]{};
                if(!cgltf_accessor_read_float(pos,i,v,3) || !cgltf_accessor_read_float(normal,i,n,3))
                    throw std::runtime_error("Cannot read sample vertex");
                Vertex out{world.point({v[0],v[1],v[2]}),normalized((cross(b,c)*n[0]+cross(c,a)*n[1]+cross(a,b)*n[2])*(1/det)),base,{metal,rough,mode}};
                if(color) {
                    float rgba[4]{1,1,1,1};cgltf_accessor_read_float(color,i,rgba,4);
                    out.color.r*=std::pow(rgba[0],1/2.2f);out.color.g*=std::pow(rgba[1],1/2.2f);out.color.b*=std::pow(rgba[2],1/2.2f);out.color.a*=rgba[3];
                }
                if(uv) {
                    cgltf_accessor_read_float(uv,i,t,2);
                    if(texture && texture->has_transform) {
                        const auto& tr=texture->transform;const float x=t[0]*tr.scale[0],y=t[1]*tr.scale[1];
                        t[0]=std::cos(tr.rotation)*x-std::sin(tr.rotation)*y+tr.offset[0];
                        t[1]=std::sin(tr.rotation)*x+std::cos(tr.rotation)*y+tr.offset[1];
                    }
                    out.uv={t[0],t[1]};
                }
                mesh.vertices.push_back(out);
            }
            const std::size_t count=prim.indices?prim.indices->count:pos->count;
            if(count%3) throw std::runtime_error("Incomplete sample triangle");
            for(std::size_t i=0;i<count;i+=3) for(int j=0;j<3;++j) {
                const auto k=i+(det<0?(j==1?2:j==2?1:0):j);
                mesh.indices.push_back(offset+static_cast<std::uint32_t>(prim.indices?cgltf_accessor_read_index(prim.indices,k):k));
            }
        }
        for(std::size_t i=0;i<node.children_count;++i) self(self,*node.children[i]);
    };
    const auto* scene=data->scene?data->scene:(data->scenes_count?&data->scenes[0]:nullptr);
    if(!scene) throw std::runtime_error("Sample has no scene");
    for(std::size_t i=0;i<scene->nodes_count;++i) visit(visit,*scene->nodes[i]);
    if(mesh.indices.empty()) throw std::runtime_error("Empty sample");
    return mesh;
}
}

void appendMesh(MeshData& target,const MeshData& source,const Mat4& transform) {
    const auto base=static_cast<std::uint32_t>(target.vertices.size());
    const Vec3 a=transform.direction({1,0,0}),b=transform.direction({0,1,0}),c=transform.direction({0,0,1});
    const float det=dot(a,cross(b,c));
    for(auto v:source.vertices) {
        v.position=transform.point(v.position);
        v.normal=normalized((cross(b,c)*v.normal.x+cross(c,a)*v.normal.y+cross(a,b)*v.normal.z)*(det<0?-1.0f:1.0f));
        v.flow=normalized(transform.direction(v.flow));target.vertices.push_back(v);
    }
    for(auto i:source.indices) target.indices.push_back(base+i);
}

std::shared_ptr<const SampleLibrary> loadSampleLibrary(const std::filesystem::path& dir) {
    auto result=std::make_shared<SampleLibrary>();
    SampleAsset original{"LONG HAIR 006",{}};
    const auto& model=model::cloneModel();
    std::vector<std::uint32_t> remap(model.vertices.size());
    for(std::size_t i=0;i<model.vertices.size();++i) if(model.vertices[i].part>=model::Part::Crown) {
        remap[i]=static_cast<std::uint32_t>(original.mesh.vertices.size());original.mesh.vertices.push_back(model.vertices[i].vertex);
    }
    for(auto i:model.indices) if(model.vertices[i].part>=model::Part::Crown) original.mesh.indices.push_back(remap[i]);
    result->hair.push_back(std::move(original));
    const std::array<std::pair<const char*,const char*>,5> styles{{{"Long","LONG"},{"Buns","BUNS"},{"SimpleParted","PARTED"},{"BuzzedFemale","SHORT F"},{"Buzzed","SHORT M"}}};
    for(const auto& [file,label]:styles) {
        auto mesh=loadStatic(dir/"hair"/(std::string("Hair_")+file+".gltf"));
        float top=-100;for(const auto& v:mesh.vertices) top=std::max(top,v.position.y);
        // All styles share the original skull dimensions. Top alignment only;
        // buns/length retain their source silhouette rather than bounding-box shrinking.
        const Mat4 fit=Mat4::translation({-.005f,1.895f-top*1.08f,0})*Mat4::rotateY(pi/2)*Mat4::scale({1.25f,1.08f,1.03f});
        MeshData fitted;appendMesh(fitted,mesh,fit);
        for(auto& v:fitted.vertices) { v.color={.20f,.21f,.23f,1};v.flow={0,-1,0}; }
        const bool flexible=std::string_view(file)=="Long" || std::string_view(file)=="Buns";
        result->hair.push_back({std::string("QUATERNIUS ")+label,std::move(fitted),flexible});
    }
    return result;
}
}
