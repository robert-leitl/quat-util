uniform vec2    uResolution;
uniform float   uTime;

in vec2 vUv;
in vec3 vNormal;

out vec4 outColor;

#include "../../libs/lygia/space/ratio.glsl"
#include "../../libs/lygia/math/decimation.glsl"
#include "../../libs/lygia/draw/circle.glsl"

void main(void) {
    vec3 color = vec3(0.0);
    vec2 st = gl_FragCoord.xy/uResolution.xy;
    st = vUv;
    
    color = vNormal * 0.5 + 0.5;
    
    outColor = vec4(color, 1.0);
}