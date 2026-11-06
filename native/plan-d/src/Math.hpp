#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <numbers>

namespace dh {
constexpr float pi = std::numbers::pi_v<float>;
constexpr float radians(float degrees) { return degrees * pi / 180.0f; }

struct Vec3 {
    float x{}, y{}, z{};
    Vec3 operator+(Vec3 b) const { return {x + b.x, y + b.y, z + b.z}; }
    Vec3 operator-(Vec3 b) const { return {x - b.x, y - b.y, z - b.z}; }
    Vec3 operator*(float s) const { return {x * s, y * s, z * s}; }
};
inline float dot(Vec3 a, Vec3 b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x};
}
inline float length(Vec3 v) { return std::sqrt(dot(v, v)); }
inline Vec3 normalized(Vec3 v) {
    const float n = length(v);
    return n > 0.000001f ? v * (1.0f / n) : Vec3{};
}

// Column-major matrices, column vectors, Y-up world. Camera uses RH view and
// a [0,1] clip depth matching SDL GPU; no OpenGL [-1,1] depth conversion.
struct Mat4 {
    std::array<float, 16> m{};
    static Mat4 identity() {
        Mat4 a;
        a.m[0] = a.m[5] = a.m[10] = a.m[15] = 1.0f;
        return a;
    }
    static Mat4 translation(Vec3 v) {
        Mat4 a = identity();
        a.m[12] = v.x; a.m[13] = v.y; a.m[14] = v.z;
        return a;
    }
    static Mat4 scale(Vec3 v) {
        Mat4 a = identity();
        a.m[0] = v.x; a.m[5] = v.y; a.m[10] = v.z;
        return a;
    }
    static Mat4 rotateY(float t) {
        Mat4 a = identity();
        a.m[0] = a.m[10] = std::cos(t);
        a.m[8] = std::sin(t); a.m[2] = -std::sin(t);
        return a;
    }
    static Mat4 rotateZ(float t) {
        Mat4 a = identity();
        a.m[0] = a.m[5] = std::cos(t);
        a.m[1] = std::sin(t); a.m[4] = -std::sin(t);
        return a;
    }
    Vec3 point(Vec3 v = {}) const {
        return {m[0]*v.x + m[4]*v.y + m[8]*v.z + m[12],
                m[1]*v.x + m[5]*v.y + m[9]*v.z + m[13],
                m[2]*v.x + m[6]*v.y + m[10]*v.z + m[14]};
    }
    Vec3 direction(Vec3 v) const {
        return {m[0]*v.x + m[4]*v.y + m[8]*v.z,
                m[1]*v.x + m[5]*v.y + m[9]*v.z,
                m[2]*v.x + m[6]*v.y + m[10]*v.z};
    }
};
inline Mat4 operator*(const Mat4& a, const Mat4& b) {
    Mat4 result;
    for (int c = 0; c < 4; ++c)
        for (int r = 0; r < 4; ++r)
            for (int k = 0; k < 4; ++k)
                result.m[c*4+r] += a.m[k*4+r] * b.m[c*4+k];
    return result;
}
inline Mat4 lookAt(Vec3 eye, Vec3 target) {
    const Vec3 forward = normalized(target - eye);
    const Vec3 right = normalized(cross(forward, {0, 1, 0}));
    const Vec3 up = cross(right, forward);
    Mat4 a = Mat4::identity();
    a.m[0] = right.x; a.m[4] = right.y; a.m[8] = right.z;
    a.m[1] = up.x; a.m[5] = up.y; a.m[9] = up.z;
    a.m[2] = -forward.x; a.m[6] = -forward.y; a.m[10] = -forward.z;
    a.m[12] = -dot(right, eye);
    a.m[13] = -dot(up, eye);
    a.m[14] = dot(forward, eye);
    return a;
}
inline Mat4 orthographic(float width, float height, float nearPlane, float farPlane) {
    Mat4 a = Mat4::identity();
    a.m[0] = 2.0f / width;
    a.m[5] = 2.0f / height;
    a.m[10] = 1.0f / (nearPlane - farPlane);
    a.m[14] = nearPlane / (nearPlane - farPlane);
    return a;
}
// Maps the unit cylinder's Y axis to a segment. The other axes retain radius.
inline Mat4 segment(Vec3 from, Vec3 to, float radius) {
    const Vec3 axis = to - from;
    const Vec3 y = normalized(axis);
    const Vec3 helper = std::abs(y.z) < 0.9f ? Vec3{0,0,1} : Vec3{1,0,0};
    const Vec3 x = normalized(cross(y, helper)) * radius;
    const Vec3 z = cross(x, y);
    Mat4 a = Mat4::identity();
    a.m[0] = x.x; a.m[1] = x.y; a.m[2] = x.z;
    a.m[4] = axis.x; a.m[5] = axis.y; a.m[6] = axis.z;
    a.m[8] = z.x; a.m[9] = z.y; a.m[10] = z.z;
    a.m[12] = from.x; a.m[13] = from.y; a.m[14] = from.z;
    return a;
}
} // namespace dh
