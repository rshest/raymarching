// Distance functions playground, by Ruslan Shestopalyuk, 2014/15

// Copy paste to https://www.shadertoy.com/new/ to run
// Or use Fragmentarium (http://syntopia.github.io/Fragmentarium), uncommenting the following line:
//#include "ShaderToy.frag"


#define PI                      3.14159265

#define MTL_BACKGROUND          -1.0
#define MTL_GROUND              1.0
#define MTL_AX                  2.0
#define MTL_AY                  3.0
#define MTL_AZ                  4.0
#define MTL_OBJ1                5.0
#define MTL_OBJ2                6.0

#define NORMAL_EPS              0.001

#define NEAR_CLIP_PLANE         0.001
#define FAR_CLIP_PLANE          1000.0
#define MAX_RAYCAST_STEPS       100
#define STEP_DAMPING            0.9
#define DIST_EPSILON            0.001


#define GLOBAL_LIGHT_COLOR      vec3(0.8,1.0,0.9)
#define SPEC_COLOR              vec3(0.8, 0.90, 0.60)
#define BACKGROUND_COLOR        vec3(0.3, 0.342, 0.5)


#define CAM_DIST                5.0
#define CAM_H                   1.5
#define CAM_FOV_FACTOR          2.5
#define LOOK_AT_H               0.2

#define LOOK_AT                 vec3(0.0, LOOK_AT_H, 0.0)


// Primitives
float plane(vec3 p, vec3 n, float offs) { return dot(p, n) - offs; }
float sphere(vec3 p, float r) { return length(p) - r; }
float cone(in vec3 p, vec2 n) { return dot(vec2(length(p.xz), p.y), n);}
float cone(vec3 p, float r, float h) {
    float ang = atan(r, h);
    vec2 n = vec2(cos(ang), sin(ang));
    float d = cone(vec3(p.x, p.y - h, p.z), n);
    return max(d, -p.y);
}


float cylinder(in vec3 p, float r) { return length(p.xz) - r; }
float cylinder(in vec3 p, float r, float h) { return max(cylinder(p, r), abs(p.y) - h*0.5); }
float torus(vec3 p, float ri, float ro) { return length(vec2(length(p.xz) - ri, p.y)) - ro; }


// Boolean operations
float diff(float d1, float d2) { return max(-d2, d1); }
float add(float d1, float d2) { return min(d2, d1); }
float intersect(float d1, float d2) { return max(d2, d1); }

// Boolean operations (with material ID in second component)
void diff(inout vec2 d1, in vec2 d2) {
    if (-d2.x > d1.x) {
        d1.x = -d2.x;
        d1.y = d2.y;
    }
}
void add(inout vec2 d1, in vec2 d2) { if (d2.x < d1.x) d1 = d2; }
void intersect(inout vec2 d1, in vec2 d2) { if (d1.x < d2.x) d1 = d2; }



// Affine transformations
vec3 translate(vec3 p, vec3 d) {
    return p - d;
}
vec2 rotate(vec2 p, float ang) {
    float c = cos(ang), s = sin(ang);
    return vec2(p.x*c-p.y*s, p.x*s+p.y*c);
}


//  Repetition
float repeat(float coord, float spacing) {
    return mod(coord, spacing) - spacing*0.5;
}

vec2 repeatAng(vec2 p, float n) {
    float ang = 2.0*PI/n;
    float sector = floor(atan(p.x, p.y)/ang + 0.5);
    p = rotate(p, sector*ang);
    return p;
}

vec3 repeatAngS(vec2 p, float n) {
    float ang = 2.0*PI/n;
    float sector = floor(atan(p.x, p.y)/ang + 0.5);
    p = rotate(p, sector*ang);
    return vec3(p.x, p.y, mod(sector, n));
}


// Helper objects
float star(vec3 p) {
    p.xy = (repeatAng(p.xy, 5.0)).xy;
    p.xz = abs(p.xz);
    return plane(p, vec3(0.5, 0.25, 0.8), -0.09);
}

vec2 grid(in vec3 p) {
    p.xz += vec2(0.5, 0.5);
    p.x = repeat(p.x, 1.0);
    p.z = repeat(p.z, 1.0);
    float c = cylinder(p.xzy, 0.003, 1.0);
    c = add(c,  cylinder(p.yxz, .003, 1.0));
    return vec2(c, MTL_GROUND);
}


float arrow(vec3 p) {
    float c = cylinder(p - vec3(0.0, 0.5, 0.0), 0.01, 1.0);
    return add(c, cone(p - vec3(0.0, 1.0, 0.0), 0.03, 0.2));
}


vec2 coordSys(vec3 p) {
    vec2 ax = vec2(arrow(p.yxz), MTL_AX);
    vec2 ay = vec2(arrow(p.xyz), MTL_AY);
    vec2 az = vec2(arrow(p.xzy), MTL_AZ);
    vec2 res = ax;
    add(res, ay);
    add(res, az);
    return res;
}


// Your distance function here
float distf(vec3 p) {
    float scale = 0.5;
    p *= 1.0/scale;
    vec3 p0 = p;
    float d = cylinder(translate(p, vec3(0.0, 1.7, 0.0)), 1.2, 0.1);
    p.xz = repeatAng(p.xz, 5.0).xy;
    d = add(d, sphere(translate(p, vec3(0.0, 0.0, 1.0)), 0.5));
    d = add(d, torus(translate(p.xzy, vec3(0.0, 1.0, 1.0)), 0.5, 0.2));
    d = intersect(d, plane(p0, normalize(vec3(1.0,1.4, 1.0)), 0.8));

    d = add(d, sphere(translate(p, vec3(0.0, -8.0, 0.0)), 8.0));
    return d*scale;
}


vec2 map(vec3 p) {
    vec2 res = grid(p);
    vec2 cs = coordSys(p);
    add(res, cs);
    
    vec2 obj = vec2(distf(p), MTL_OBJ1);
    
    add(res, obj);
    return res;
}


vec3 calcNormal(in vec3 p)
{
    vec2 d = vec2(NORMAL_EPS, 0.0);
    return normalize(vec3(
        map(p + d.xyy).x - map(p - d.xyy).x,
        map(p + d.yxy).x - map(p - d.yxy).x,
        map(p + d.yyx).x - map(p - d.yyx).x));
}


vec2 rayMarch(in vec3 ro, in vec3 rd) {
    float t = NEAR_CLIP_PLANE;
    float m = MTL_BACKGROUND;
    for (int i=0; i < MAX_RAYCAST_STEPS; i++) {
        vec2 res = map(ro + rd*t);
        if (res.x < DIST_EPSILON || t>FAR_CLIP_PLANE) break;
        t += res.x*STEP_DAMPING;
        m = res.y;
    }

    if (t > FAR_CLIP_PLANE) m = MTL_BACKGROUND;
    return vec2(t, m);
}


vec3 getMaterialColor(float matID) {
    vec3 col = BACKGROUND_COLOR;
    if (matID <= MTL_GROUND) col = vec3(0.3, 0.3, 0.5);
    else if (matID <= MTL_AX) col = vec3(1.0, 0.0, 0.0);
    else if (matID <= MTL_AY) col = vec3(0.0, 1.0, 0.0);
    else if (matID <= MTL_AZ) col = vec3(0.0, 0.0, 1.0);
    else if (matID <= MTL_OBJ1) col = vec3(0.8, 0.8, 1.8);
    else if (matID <= MTL_OBJ2) col = vec3(1.4, 1.3, 0.3);
    else col = vec3(0.7, 0.7, 1.8);
    return col;
}


vec3 applyFog(vec3 col, float dist) {
    return mix(col, BACKGROUND_COLOR, 1.0 - exp(-0.0015*dist*dist));
}


vec3 render(in vec3 ro, in vec3 rd) {
    vec2 res = rayMarch(ro, rd);
    float t = res.x;
    float mtlID = res.y;
    vec3  lig = -rd;
    vec3 pos = ro + t*rd;
    vec3 nor = calcNormal(pos);
    vec3 mtlColor = getMaterialColor(mtlID);
    
    float ambient = 0.05;
    float diffuse = clamp(dot(nor, lig), 0.0, 1.0);

    vec3 col = mtlColor*(ambient + GLOBAL_LIGHT_COLOR*diffuse);
    col = applyFog(col, t);
    return vec3(clamp(col, 0.0, 1.0));
}


vec3 getRayDir(vec3 camPos, vec3 viewDir, vec2 pixelPos) {
    vec3 camRight = normalize(cross(viewDir, vec3(0.0, 1.0, 0.0)));
    vec3 camUp = normalize(cross(camRight, viewDir));
    return normalize(pixelPos.x*camRight + pixelPos.y*camUp + CAM_FOV_FACTOR*viewDir);
}


void main(void) {
    vec2 q = gl_FragCoord.xy/iResolution.xy;
    vec2 p = -1.0+2.0*q;
    p.x *= iResolution.x/iResolution.y;
    float ang = 0.1*(40.0 + iGlobalTime);
    vec3 camPos = vec3(CAM_DIST*cos(ang), CAM_H, CAM_DIST*sin(ang));
    vec3 rayDir = getRayDir(camPos,normalize(LOOK_AT - camPos), p);
    vec3 color = render(camPos, rayDir);
    gl_FragColor = vec4(color, 1.0);
}



