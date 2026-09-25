<template>
  <div class="wheel-shell" :class="{ spinning }">
    <div class="halo" aria-hidden="true"/><div class="pointer" aria-hidden="true"/>
    <svg viewBox="0 0 360 360" role="img" aria-label="Roleta de prêmios">
      <defs>
        <radialGradient v-for="(item,i) in segments" :id="`slice-${i}`" :key="item.key" cx="50%" cy="45%" r="72%"><stop offset="0" :stop-color="item.light"/><stop offset="1" :stop-color="item.color"/></radialGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g class="rotating" :style="{transform:`rotate(${rotation}deg)`}">
        <path v-for="(_,i) in segments" :key="i" :d="slicePath(i)" :fill="`url(#slice-${i})`" class="slice"/>
        <g v-for="(item,i) in segments" :key="item.key" :transform="labelTransform(i)"><text x="180" y="72" text-anchor="middle" :class="{muted:item.empty}">{{ item.short }}</text></g>
        <circle cx="180" cy="180" r="151" fill="none" class="inner-ring"/>
      </g>
      <circle cx="180" cy="180" r="166" fill="none" class="outer-ring" filter="url(#glow)"/>
      <circle v-for="light in lights" :key="light.i" :cx="light.x" :cy="light.y" r="3.8" :class="['light',{alt:light.i%2}]"/>
    </svg>
    <div class="hub" aria-hidden="true"><Icon name="ph:crown-simple-fill"/></div>
  </div>
  <div class="legend" aria-label="Prêmios possíveis"><span v-for="item in uniqueSegments" :key="item.label"><i :style="{background:item.color}"/>{{ item.label }}</span></div>
</template>
<script setup lang="ts">
export interface RouletteSegment{key:string;short:string;label:string;color:string;light:string;empty?:boolean}
const props=defineProps<{segments:RouletteSegment[];rotation:number;spinning:boolean}>()
const point=(angle:number,r=150)=>{const a=(angle-90)*Math.PI/180;return{x:180+r*Math.cos(a),y:180+r*Math.sin(a)}}
const slicePath=(i:number)=>{const size=360/props.segments.length,a=point(i*size),b=point((i+1)*size);return`M180 180 L${a.x} ${a.y} A150 150 0 0 1 ${b.x} ${b.y} Z`}
const labelTransform=(i:number)=>{const size=360/props.segments.length,angle=i*size+size/2,flip=angle>90&&angle<270?180:0;return`rotate(${angle} 180 180) rotate(${flip} 180 72)`}
const lights=computed(()=>Array.from({length:30},(_,i)=>({i,...point(i*12,166)})))
const uniqueSegments=computed(()=>props.segments.filter((s,i,a)=>a.findIndex(x=>x.label===s.label)===i))
</script>
<style scoped>
.wheel-shell{position:relative;width:min(82vw,360px);aspect-ratio:1;margin:28px auto 16px;isolation:isolate}.halo{position:absolute;inset:8%;z-index:-1;border-radius:50%;background:var(--accent);filter:blur(52px);opacity:.22;transition:opacity .2s}.wheel-shell svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 24px 35px #000b)}.rotating{transform-origin:180px 180px;transition:transform 4s cubic-bezier(.16,1,.3,1)}.slice{stroke:#090a0f;stroke-width:3}.inner-ring{stroke:#ffffff25;stroke-width:2}.outer-ring{stroke:var(--accent);stroke-width:5}.light{fill:#fff1d1;filter:drop-shadow(0 0 3px #fff)}.light.alt{fill:var(--accent);filter:drop-shadow(0 0 4px var(--accent))}text{fill:#fff;font-size:12px;font-weight:900;letter-spacing:.03em}text.muted{fill:#ffffffa0}.pointer{position:absolute;z-index:4;top:-5px;left:50%;width:0;height:0;transform:translateX(-50%);border-left:15px solid transparent;border-right:15px solid transparent;border-top:35px solid #fff;filter:drop-shadow(0 5px 5px #000)}.hub{position:absolute;z-index:3;inset:50% auto auto 50%;width:66px;height:66px;display:grid;place-items:center;transform:translate(-50%,-50%) rotate(45deg);border:3px solid #fff6;border-radius:17px;background:linear-gradient(145deg,var(--accent),color-mix(in srgb,var(--accent) 45%,#21051a));box-shadow:0 8px 30px #000b,0 0 25px color-mix(in srgb,var(--accent) 45%,transparent)}.hub svg{font-size:30px;transform:rotate(-45deg);color:#fff}.spinning .halo{opacity:.45;animation:halo 1s ease-in-out infinite alternate}.spinning .light{animation:lights .4s steps(2,end) infinite}.legend{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:440px;margin:0 auto 24px}.legend span{display:flex;align-items:center;gap:7px;min-height:32px;padding:6px 10px;border:1px solid #ffffff12;border-radius:999px;color:#c5c2ca;background:#ffffff08;font-size:11px}.legend i{width:8px;height:8px;border-radius:50%}@keyframes halo{to{transform:scale(1.12);opacity:.6}}@keyframes lights{50%{opacity:.35}}@media(max-width:380px){.wheel-shell{width:276px}text{font-size:11px}}@media(prefers-reduced-motion:reduce){.rotating{transition-duration:.01ms}.spinning .halo,.spinning .light{animation:none}}
</style>
