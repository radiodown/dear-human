#include "CloneModelData.hpp"
#include <bit>
#include <cstdio>
#include <fstream>
#include <iomanip>
#include <limits>
#include <locale>
#include <sstream>
#include <stdexcept>

namespace dh {
namespace {
struct BinaryWriter {
    std::vector<std::uint8_t> bytes;
    std::vector<std::string> views,accessors;
    template<class T> int add(const std::vector<T>& data,int components,const char* type,int componentType,int target,
                              const std::string& bounds={}) {
        while(bytes.size()%4) bytes.push_back(0);
        const auto offset=bytes.size(),size=data.size()*sizeof(T);
        const auto* first=reinterpret_cast<const std::uint8_t*>(data.data());
        bytes.insert(bytes.end(),first,first+size);
        std::ostringstream view;
        view<<"{\"buffer\":0,\"byteOffset\":"<<offset<<",\"byteLength\":"<<size;
        if(target) view<<",\"target\":"<<target;
        view<<"}";
        const auto viewIndex=views.size(); views.push_back(view.str());
        std::ostringstream accessor;
        accessor<<"{\"bufferView\":"<<viewIndex<<",\"componentType\":"<<componentType<<",\"count\":"
                <<data.size()/components<<",\"type\":\""<<type<<"\""<<bounds<<"}";
        accessors.push_back(accessor.str());
        return static_cast<int>(accessors.size()-1);
    }
};
void u32(std::ostream& stream,std::uint32_t value) {
    const char bytes[]{static_cast<char>(value),static_cast<char>(value>>8),static_cast<char>(value>>16),static_cast<char>(value>>24)};
    stream.write(bytes,4);
}
template<class T> void joined(std::ostream& out,const std::vector<T>& values) {
    for(std::size_t i=0;i<values.size();++i) {if(i)out<<',';out<<values[i];}
}
} // namespace

void exportCloneModel(const std::filesystem::path& destination,const std::filesystem::path& hairAtlas,bool hairOnly) {
    static_assert(std::endian::native==std::endian::little,"GLB packing targets little-endian Mac/Windows architectures");
    auto model=model::cloneModel();
    if(hairOnly) {
        std::vector<model::BoundVertex> hairVertices;
        std::vector<std::uint32_t> hairIndices;
        std::vector<std::uint32_t> remap(model.vertices.size(),std::numeric_limits<std::uint32_t>::max());
        for(std::size_t i=0;i<model.indices.size();i+=3) {
            if(model.vertices[model.indices[i]].part<model::Part::Crown)continue;
            for(int j=0;j<3;++j) {
                const auto source=model.indices[i+j];
                if(remap[source]==std::numeric_limits<std::uint32_t>::max()) {
                    remap[source]=static_cast<std::uint32_t>(hairVertices.size());
                    hairVertices.push_back(model.vertices[source]);
                }
                hairIndices.push_back(remap[source]);
            }
        }
        model.vertices=std::move(hairVertices);model.indices=std::move(hairIndices);
    }
    std::vector<float> positions,normals,colors,weights,inverseBind,uvs;
    std::vector<std::uint16_t> joints;
    Vec3 minimum{std::numeric_limits<float>::max(),std::numeric_limits<float>::max(),std::numeric_limits<float>::max()};
    Vec3 maximum=minimum*-1;
    for(const auto& source:model.vertices) {
        const auto& v=source.vertex;
        positions.insert(positions.end(),{v.position.x,v.position.y,v.position.z});
        uvs.insert(uvs.end(),v.uv.begin(),v.uv.end());
        normals.insert(normals.end(),{v.normal.x,v.normal.y,v.normal.z});
        colors.insert(colors.end(),{std::pow(v.color.r,2.2f),std::pow(v.color.g,2.2f),std::pow(v.color.b,2.2f),v.color.a});
        weights.insert(weights.end(),source.weights.begin(),source.weights.end());
        joints.insert(joints.end(),source.joints.begin(),source.joints.end());
        minimum={std::min(minimum.x,v.position.x),std::min(minimum.y,v.position.y),std::min(minimum.z,v.position.z)};
        maximum={std::max(maximum.x,v.position.x),std::max(maximum.y,v.position.y),std::max(maximum.z,v.position.z)};
    }
    for(const auto& matrix:model.inverseBind) inverseBind.insert(inverseBind.end(),matrix.m.begin(),matrix.m.end());
    BinaryWriter binary;
    std::ostringstream bounds; bounds.imbue(std::locale::classic()); bounds<<std::setprecision(8);
    bounds<<",\"min\":["<<minimum.x<<','<<minimum.y<<','<<minimum.z<<"],\"max\":["<<maximum.x<<','<<maximum.y<<','<<maximum.z<<']';
    const int pos=binary.add(positions,3,"VEC3",5126,34962,bounds.str());
    const int nor=binary.add(normals,3,"VEC3",5126,34962);
    const int col=binary.add(colors,4,"VEC4",5126,34962);
    const int joi=binary.add(joints,4,"VEC4",5123,34962);
    const int wei=binary.add(weights,4,"VEC4",5126,34962);
    const int uv=binary.add(uvs,2,"VEC2",5126,34962);
    const int inv=binary.add(inverseBind,16,"MAT4",5126,0);
    struct Primitive {int accessor;std::size_t material,part;};
    std::vector<Primitive> primitives;
    constexpr std::array<const char*,8> partNames{"body","head","crown","fringe","temple","back","braid","wisps"};
    for(std::size_t part=0;part<partNames.size();++part)for(std::size_t material=0;material<model::MaterialCount;++material) {
        std::vector<std::uint32_t> indices;
        for(std::size_t i=0;i<model.indices.size();i+=3) {
            const auto& v=model.vertices[model.indices[i]];
            if(v.material==material && static_cast<std::size_t>(v.part)==part)
                indices.insert(indices.end(),{model.indices[i],model.indices[i+1],model.indices[i+2]});
        }
        if(!indices.empty())primitives.push_back({binary.add(indices,1,"SCALAR",5125,34963),material,part});
    }
    std::ifstream atlas(hairAtlas,std::ios::binary);
    if(!atlas)throw std::runtime_error("Cannot read hair atlas: "+hairAtlas.string());
    const std::vector<std::uint8_t> png{std::istreambuf_iterator<char>(atlas),std::istreambuf_iterator<char>()};
    while(binary.bytes.size()%4)binary.bytes.push_back(0);
    const auto imageView=binary.views.size();
    binary.views.push_back("{\"buffer\":0,\"byteOffset\":"+std::to_string(binary.bytes.size())+",\"byteLength\":"+std::to_string(png.size())+"}");
    binary.bytes.insert(binary.bytes.end(),png.begin(),png.end());
    std::ostringstream json; json.imbue(std::locale::classic()); json<<std::setprecision(8);
    json<<"{\"asset\":{\"version\":\"2.0\",\"generator\":\"Dear Human hair_004 / guide cards and original coverage atlas\"},"
        <<"\"scene\":0,\"scenes\":[{\"nodes\":[0,"<<JointCount<<"]}],\"nodes\":[";
    Skeleton skeleton;
    for(std::size_t i=0;i<JointCount;++i) {
        if(i)json<<',';
        const auto& bone=skeleton.bones()[i];
        const Mat4 local=bone.parent<0?model.bindWorld[i]:model.inverseBind[bone.parent]*model.bindWorld[i];
        json<<"{\"name\":\""<<bone.name<<"\",\"matrix\":[";
        for(int k=0;k<16;++k){if(k)json<<',';json<<local.m[k];}
        json<<']';
        std::vector<int> children;
        for(std::size_t j=0;j<JointCount;++j)if(skeleton.bones()[j].parent==static_cast<int>(i))children.push_back(static_cast<int>(j));
        if(!children.empty()){json<<",\"children\":[";joined(json,children);json<<']';}
        json<<'}';
    }
    json<<",{\"name\":\"clone_01_hair_004\",\"mesh\":0,\"skin\":0}],"
        <<"\"skins\":[{\"name\":\"clone_01_21_joint_skin\",\"inverseBindMatrices\":"<<inv<<",\"skeleton\":0,\"joints\":[";
    for(std::size_t i=0;i<JointCount;++i){if(i)json<<',';json<<i;}
    json<<"]}],\"meshes\":[{\"name\":\"clone_01_actual_3d_surfaces\",\"primitives\":[";
    bool first=true;
    for(const auto& primitive:primitives) {
        if(!first)json<<',';
        first=false;
        json<<"{\"attributes\":{\"POSITION\":"<<pos<<",\"NORMAL\":"<<nor<<",\"COLOR_0\":"<<col
            <<",\"JOINTS_0\":"<<joi<<",\"WEIGHTS_0\":"<<wei;
        if(primitive.material==model::HairCards)json<<",\"TEXCOORD_0\":"<<uv;
        json<<"},\"indices\":"<<primitive.accessor<<",\"material\":"<<primitive.material
            <<",\"mode\":4,\"extras\":{\"part\":\""<<partNames[primitive.part]<<"\"}}";
    }
    json<<"]}],\"materials\":[";
    for(std::size_t i=0;i<model::MaterialCount;++i) {
        if(i)json<<',';
        const auto& material=model.materials[i];
        json<<"{\"name\":\""<<material.name<<"\",\"doubleSided\":true,\"pbrMetallicRoughness\":{\"baseColorFactor\":[1,1,1,1],\"metallicFactor\":"
            <<material.metallic<<",\"roughnessFactor\":"<<material.roughness;
        if(i==model::HairCards)json<<",\"baseColorTexture\":{\"index\":0}";
        json<<'}';
        if(i==model::HairCards)json<<",\"alphaMode\":\"MASK\",\"alphaCutoff\":0.35";
        json<<'}';
    }
    json<<"],\"images\":[{\"bufferView\":"<<imageView<<",\"mimeType\":\"image/png\"}],\"samplers\":[{\"magFilter\":9729,\"minFilter\":9729,\"wrapS\":33071,\"wrapT\":33071}],\"textures\":[{\"sampler\":0,\"source\":0}],\"buffers\":[{\"byteLength\":"<<binary.bytes.size()<<"}],\"bufferViews\":[";
    joined(json,binary.views); json<<"],\"accessors\":[";joined(json,binary.accessors);
    json<<"],\"extras\":{\"status\":\"modeling study; not approved final character art\",\"textures\":true,\"referenceImageBillboard\":false,"
        <<"\"hairShader\":\"standard PBR fallback; native uses shifted tangent lobes\",\"clothPhysics\":false,\"nativeSkinning\":\"CPU linear blend\",\"triangleCount\":"<<model.indices.size()/3<<"}}";
    std::string encoded=json.str(); while(encoded.size()%4)encoded+=' ';
    while(binary.bytes.size()%4)binary.bytes.push_back(0);
    if(!destination.parent_path().empty())std::filesystem::create_directories(destination.parent_path());
    std::ofstream file(destination,std::ios::binary);
    if(!file)throw std::runtime_error("Cannot write GLB: "+destination.string());
    u32(file,0x46546C67);u32(file,2);u32(file,static_cast<std::uint32_t>(12+8+encoded.size()+8+binary.bytes.size()));
    u32(file,static_cast<std::uint32_t>(encoded.size()));u32(file,0x4E4F534A);file.write(encoded.data(),static_cast<std::streamsize>(encoded.size()));
    u32(file,static_cast<std::uint32_t>(binary.bytes.size()));u32(file,0x004E4942);file.write(reinterpret_cast<const char*>(binary.bytes.data()),static_cast<std::streamsize>(binary.bytes.size()));
    if(!file)throw std::runtime_error("GLB write failed: "+destination.string());
    std::printf("Exported %s: %zu vertices, %zu triangles, %zu joints, %u materials\n",destination.string().c_str(),model.vertices.size(),model.indices.size()/3,
        static_cast<std::size_t>(JointCount),static_cast<unsigned>(model::MaterialCount));
}
} // namespace dh
