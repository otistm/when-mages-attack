/**
 * Arcane Floor Shader
 * Creates a dark stone floor with glowing magical rune patterns
 */

export const arcaneFloorVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const arcaneFloorFragmentShader = `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uRuneColor;
  uniform vec3 uAccentColor;
  uniform float uRuneIntensity;
  
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  // Stone texture pattern
  float stonePattern(vec2 uv) {
    float scale = 3.0;
    float noise1 = snoise(uv * scale) * 0.5 + 0.5;
    float noise2 = snoise(uv * scale * 2.0 + 100.0) * 0.25 + 0.5;
    float noise3 = snoise(uv * scale * 4.0 + 200.0) * 0.125 + 0.5;
    return noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;
  }
  
  // Arcane circle pattern
  float circlePattern(vec2 center, float radius, float thickness) {
    float dist = length(vWorldPosition.xz - center);
    return smoothstep(radius + thickness, radius, dist) * smoothstep(radius - thickness * 2.0, radius - thickness, dist);
  }
  
  // Arcane rune line pattern
  float runeLines(vec2 pos, float time) {
    float lines = 0.0;
    
    // Radial lines from center
    float angle = atan(pos.y, pos.x);
    float dist = length(pos);
    
    // Multiple rotating rings
    for (int i = 0; i < 3; i++) {
      float ringRadius = 3.0 + float(i) * 2.5;
      float ringSpeed = 0.1 + float(i) * 0.05;
      float ringThickness = 0.08;
      
      // Rotating ring
      float ring = circlePattern(vec2(0.0), ringRadius, ringThickness);
      
      // Segmented ring with rotation
      float segments = 8.0 + float(i) * 4.0;
      float rotatedAngle = angle + time * ringSpeed * (float(i % 2) * 2.0 - 1.0);
      float segmentMask = smoothstep(0.3, 0.5, abs(sin(rotatedAngle * segments)));
      
      lines += ring * segmentMask * 0.6;
    }
    
    // Inner glyphs
    float innerDist = length(pos);
    if (innerDist < 2.0) {
      float glyphAngle = atan(pos.y, pos.x);
      float glyphs = abs(sin(glyphAngle * 6.0 + time * 0.2)) * 0.5;
      glyphs *= smoothstep(2.0, 1.0, innerDist) * smoothstep(0.5, 1.0, innerDist);
      lines += glyphs * 0.4;
    }
    
    return lines;
  }
  
  // Grid lines for stone tiles
  float tileGrid(vec2 uv, float size) {
    vec2 grid = abs(fract(uv * size) - 0.5);
    float line = min(grid.x, grid.y);
    return smoothstep(0.02, 0.04, line);
  }
  
  void main() {
    vec2 worldUV = vWorldPosition.xz * 0.1;
    
    // Base stone color with noise variation
    float stone = stonePattern(worldUV);
    vec3 stoneColor = uBaseColor * (0.7 + stone * 0.3);
    
    // Add tile grid lines (darker grout between stones)
    float tiles = tileGrid(vWorldPosition.xz, 0.25);
    stoneColor *= 0.85 + tiles * 0.15;
    
    // Add subtle stone texture variation
    float microDetail = snoise(vWorldPosition.xz * 2.0) * 0.1;
    stoneColor += microDetail * 0.05;
    
    // Arcane rune patterns
    vec2 runePos = vWorldPosition.xz;
    float runes = runeLines(runePos, uTime);
    
    // Pulsing glow effect
    float pulse = sin(uTime * 0.5) * 0.3 + 0.7;
    float runeGlow = runes * uRuneIntensity * pulse;
    
    // Energy flow lines (subtle)
    float energyFlow = snoise(vec2(vWorldPosition.x * 0.5, vWorldPosition.z * 0.5 + uTime * 0.1));
    energyFlow = smoothstep(0.3, 0.7, energyFlow) * 0.15;
    
    // Combine colors
    vec3 finalColor = stoneColor;
    finalColor = mix(finalColor, uRuneColor, runeGlow);
    finalColor += uAccentColor * energyFlow * 0.3;
    
    // Add vignette from center
    float vignette = 1.0 - smoothstep(5.0, 15.0, length(vWorldPosition.xz));
    runeGlow *= vignette;
    
    // Edge darkening
    float edgeDark = smoothstep(12.0, 8.0, length(vWorldPosition.xz));
    finalColor *= 0.6 + edgeDark * 0.4;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
