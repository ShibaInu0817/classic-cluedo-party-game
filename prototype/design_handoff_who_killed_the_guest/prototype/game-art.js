(function(){
const INK='#1B1B1B',NS='stroke="none"',SKIN='#F5C49A',HAIR='#3A2A2A';
let UID=0;
const R=(x,y,w,h,f,rx=0,ex='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${ex}/>`;
const C=(x,y,r,f,ex='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${ex}/>`;
const E=(x,y,rx,ry,f,ex='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${ex}/>`;
const P=(d,f='none',ex='')=>`<path d="${d}" fill="${f}" ${ex}/>`;
const T=(x,y,s,f,t,ex='')=>`<text x="${x}" y="${y}" font-size="${s}" fill="${f}" font-family="ZCOOL KuaiLe" text-anchor="middle" stroke="none" ${ex}>${t}</text>`;
const G=s=>`<g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${s}</g>`;
const N=(n,f)=>[...Array(n)].map((_,i)=>f(i)).join('');
let NORAYS=false;const rays=(a,b,cx=123,cy=96,n=20)=>NORAYS?'':R(-10,-10,280,380,a,0,NS)+N(n,i=>{const t1=i/n*6.2832,t2=(i+.5)/n*6.2832;return P(`M${cx} ${cy}L${(cx+Math.cos(t1)*500).toFixed(1)} ${(cy+Math.sin(t1)*500).toFixed(1)}L${(cx+Math.cos(t2)*500).toFixed(1)} ${(cy+Math.sin(t2)*500).toFixed(1)}Z`,b,NS);});
const dotPat=(c,sp=12,r=1.8,op=1,w=300,h=400)=>{const id='dp'+(UID++);return `<defs><pattern id="${id}" width="${sp}" height="${sp}" patternUnits="userSpaceOnUse"><circle cx="${sp/2}" cy="${sp/2}" r="${r}" fill="${c}"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#${id})" opacity="${op}"/>`;};
const star=(cx,cy,r1,r2,n,f,ex='')=>P(N(n*2,i=>{const a=i/(n*2)*6.2832-1.5708,r=i%2?r2:r1;return (i?'L':'M')+(cx+Math.cos(a)*r).toFixed(1)+' '+(cy+Math.sin(a)*r).toFixed(1);})+'Z',f,ex);
const body=(o,skin=SKIN)=>P('M28 216C28 166 74 148 123 148C172 148 218 166 218 216Z',o)+R(109,122,28,32,skin)+C(81,98,9,skin)+C(165,98,9,skin)+E(123,92,42,46,skin);
const blush=()=>E(98,114,8,4.5,'#FF8A7A',NS+' opacity=".55"')+E(148,114,8,4.5,'#FF8A7A',NS+' opacity=".55"');
const dotEyes=(dx=0,dy=0)=>C(107+dx,99+dy,4.5,INK,NS)+C(139+dx,99+dy,4.5,INK,NS)+C(108.5+dx,97.5+dy,1.5,'#fff',NS)+C(140.5+dx,97.5+dy,1.5,'#fff',NS);
const hand=(x,y)=>E(x,y,11,10,SKIN)+P(`M${x-5} ${y-4}h9M${x-6} ${y+2}h9`,'none','stroke-width="2"');
const nose=()=>P('M121 104Q117 112 124 112','none','stroke-width="2.5"');
const PORTRAIT={
'二叔':()=>rays('#7FD3A8','#64C896')+G(body('#2FA37C')+R(102,144,42,14,'#2FA37C',6)+P('M123 158V216','none','stroke-width="2.5"')+
  [172,188,204].map(y=>P(`M112 ${y}h22`,'none','stroke="#FFD54A" stroke-width="4"')+C(123,y,3.5,'#FFD54A','stroke-width="2"')).join('')+
  P('M82 98Q76 66 92 58L98 86Z','#555')+P('M164 98Q170 66 154 58L148 86Z','#555')+
  P('M92 62Q124 40 156 60M96 56Q124 36 152 52M102 50Q126 34 146 46','none','stroke-width="2.5"')+
  P('M94 80L117 86M129 86L152 80','none','stroke-width="5.5"')+
  C(107,99,12,'#E6F7FF')+C(139,99,12,'#E6F7FF')+P('M119 99h8M95 97L83 93M151 97L163 93')+dotEyes(2,1)+nose()+
  P('M108 121Q124 130 140 117')+P('M139 119L163 110','none','stroke="#E59A5F" stroke-width="3"')+
  [104,112,120,128,136,144].map(x=>C(x,133,1.3,INK,NS)).join('')+
  R(166,146,34,54,'#E8483B',7)+R(166,146,34,10,'#C9C2B8',4)+T(187,176,15,'#fff','啤')+R(148,174,12,10,'#FFD54A',3,'stroke-width="2"')+hand(166,190)),
'大姑':()=>rays('#E4CCF5','#D2B0EE')+G([[82,70],[76,94],[82,120],[164,70],[170,94],[164,120],[100,52],[146,52],[123,46]].map(([x,y])=>C(x,y,16,HAIR)).join('')+
  body('#8A4FB0')+R(103,140,40,18,'#8A4FB0',7)+P('M123 158Q146 168 170 160','none','stroke-width="2.5"')+
  [[66,190],[94,204],[156,194],[186,180],[134,212],[200,206]].map(([x,y])=>C(x,y,6,'#FFB4A8','stroke-width="2"')+C(x,y,2,'#FFD54A',NS)).join('')+
  [-16,-8,0,8,16].map(d=>C(123+d,166-d*d/40,3.5,'#fff','stroke-width="1.5"')).join('')+
  C(81,112,5,'#FFD54A','stroke-width="2"')+C(165,112,5,'#FFD54A','stroke-width="2"')+
  [[94,62,12],[110,54,13],[128,52,13],[146,58,12],[158,72,10],[88,76,10]].map(([x,y,r])=>C(x,y,r,HAIR)).join('')+
  P('M96 86Q106 80 116 86M130 80Q142 70 153 78','none','stroke-width="4"')+dotEyes()+P('M100 95L96 91M146 95L150 91','none','stroke-width="2.5"')+nose()+
  E(123,121,9,5,'#E8483B')+P('M115 121h16','none','stroke-width="2"')+blush()+
  P('M150 200L176 150Q210 154 214 190Z','#E8483B')+P('M150 200L186 152M150 200L200 160M150 200L210 176','none','stroke="#FFD54A" stroke-width="2.5"')+hand(152,196)),
'表哥':()=>rays('#B8CCF7','#9DB8F2')+G(P('M66 216C62 160 88 138 123 138C158 138 184 160 180 216Z','#3E6FD8')+body('#5B8DEF')+
  P('M92 216L98 194H148L154 216','#3E6FD8')+P('M112 156L110 184M134 156L136 184','none','stroke-width="2.5"')+C(110,187,3,'#fff','stroke-width="2"')+C(136,187,3,'#fff','stroke-width="2"')+
  P('M92 148Q123 174 154 148','none','stroke-width="7"')+R(80,136,18,26,'#E8483B',7)+R(148,136,18,26,'#E8483B',7)+
  P('M80 92L76 62L92 70L92 42L108 58L118 32L130 56L144 38L148 62L164 52L160 74L168 90Q152 66 123 66Q96 66 80 92Z',INK)+
  P('M97 88L115 90M131 90L149 88','none','stroke-width="4"')+P('M98 98h18M130 98h18')+C(108,102,3.5,INK,NS)+C(140,102,3.5,INK,NS)+nose()+
  P('M114 123h18')+R(142,108,18,9,'#FFE3CF',3,'stroke-width="2" transform="rotate(-20 151 112)"')+
  R(170,142,32,54,INK,7)+R(174,148,24,40,'#7FD3A8',3,NS)+P('M180 168l6 6 8-12','none','stroke="#fff" stroke-width="2.5"')+hand(172,184)),
'大嫂':()=>rays('#FFDCD4','#FFC4B8')+G(P('M98 22L150 54','none','stroke="#E8483B" stroke-width="5"')+P('M104 16L154 46','none','stroke="#FFD54A" stroke-width="5"')+C(123,40,20,HAIR)+
  body('#E07AA0')+P('M90 216L96 168H150L156 216Z','#FFFFFF')+P('M100 168L110 150M146 168L136 150','none','stroke-width="3"')+R(111,184,24,18,'#FFD54A',4,'stroke-width="2.5"')+
  P('M81 94Q78 50 123 48Q168 50 165 94Q154 66 130 64Q112 74 81 94Z',HAIR)+C(81,112,5,'#2FA37C','stroke-width="2"')+C(165,112,5,'#2FA37C','stroke-width="2"')+
  P('M98 100Q107 91 116 100M130 100Q139 91 148 100','none','stroke-width="4"')+nose()+P('M108 117Q123 134 138 117Z','#E8483B')+blush()+
  P('M190 198V134','none','stroke-width="9"')+P('M190 198V134','none','stroke="#B86B3A" stroke-width="5"')+E(190,126,16,11,'#C9C2B8')+E(190,124,9,4,'#fff',NS)+hand(190,180)),
'姑丈':()=>rays('#E8E2D6','#D6CDBE')+G(body('#7C8085')+P('M104 150L123 196L142 150Z','#fff')+P('M117 160H129L132 198L123 208L114 198Z','#E8483B')+
  P('M104 150L92 172L110 176L123 200Z','#5E6268')+P('M142 150L154 172L136 176L123 200Z','#5E6268')+
  P('M81 92Q76 48 122 48Q168 48 165 90Q160 66 140 62L106 64Q88 68 81 92Z','#2A2A2A')+P('M106 52Q104 58 106 64','none','stroke="#fff" stroke-width="2"')+
  P('M96 88L115 82M131 82L150 88','none','stroke-width="4"')+C(107,100,3.5,INK,NS)+C(139,100,3.5,INK,NS)+nose()+
  P('M102 118Q112 108 123 115Q134 108 144 118Q134 124 123 119Q112 124 102 118Z','#2A2A2A')+P('M117 128Q123 125 129 128','none','stroke-width="2.5"')+
  P('M162 62Q170 76 162 82Q154 76 162 62Z','#9DB8F2','stroke-width="2.5"')+P('M70 70q-4 6 0 10M176 48q4 6 0 10','none','stroke-width="2"')+
  '<g transform="rotate(-10 180 180)">'+R(148,146,66,64,'#fff',2)+T(166,176,20,INK,'报')+P('M182 160h24M182 170h24M156 186h50M156 194h50M156 202h40','none','stroke-width="2"')+'</g>'+hand(150,188)),
'伯母':()=>rays('#FFF1C9','#F0DCA0')+G(P('M78 94Q74 42 123 40Q172 42 168 94L178 178H148L146 112H100L98 178H68Z',HAIR)+body('#C9A04A')+P('M106 150Q123 176 140 150Z','#FFF7EC')+
  P('M104 150L92 178L108 182L118 170Z','#A9842F')+P('M142 150L154 178L138 182L128 170Z','#A9842F')+P('M112 160Q123 170 134 160','none','stroke="#FFD54A" stroke-width="2.5"')+C(123,169,3.5,'#FFD54A','stroke-width="1.5"')+
  P('M81 98Q80 50 123 48Q166 50 165 98Q152 62 125 58Q100 62 81 98Z',HAIR)+R(92,50,28,15,INK,7)+R(126,50,28,15,INK,7)+P('M120 56h6')+P('M97 55h6M131 55h6','none','stroke="#fff" stroke-width="2"')+
  C(81,116,7,'none','stroke="#FFD54A" stroke-width="3"')+C(165,116,7,'none','stroke="#FFD54A" stroke-width="3"')+
  P('M97 86Q106 82 116 86M131 84Q140 80 149 84','none','stroke-width="3.5"')+C(107,99,4.5,INK,NS)+C(108.5,97.5,1.5,'#fff',NS)+P('M100 94L97 90M104 92L103 88','none','stroke-width="2"')+
  P('M131 100Q139 93 147 100')+nose()+P('M112 118Q123 128 134 118Q123 122 112 118Z','#E8483B')+blush()+
  P('M172 170Q186 142 200 170','none','stroke-width="4"')+R(160,166,52,40,'#E8483B',8)+R(179,180,14,10,'#FFD54A',2,'stroke-width="2"')+hand(160,192)),
'大伯':()=>rays('#FFC9BE','#FFB4A8')+G(P('M22 216C22 160 70 146 123 146C176 146 224 160 224 216Z','#E8483B')+R(108,120,30,32,SKIN)+C(78,98,11,SKIN)+C(168,98,11,SKIN)+E(123,94,46,48,SKIN)+
  P('M100 150L123 172L146 150','none','stroke-width="3"')+C(162,186,16,'#FFD54A')+T(162,193,18,'#E8483B','福')+
  P('M80 86Q78 66 88 62M166 86Q168 66 158 62','none','stroke="#C9C2B8" stroke-width="6"')+
  P('M96 84Q106 78 116 84M130 84Q140 78 150 84','none','stroke-width="4"')+P('M98 100Q107 92 116 100M130 100Q139 92 148 100','none','stroke-width="4"')+nose()+
  P('M104 116Q123 136 142 116Z','#fff')+P('M108 136Q123 144 138 136','none','stroke-width="2.5"')+blush()+P('M96 154Q123 170 150 154','none','stroke="#FFD54A" stroke-width="4"'))+
  '<g transform="rotate(-14 123 104)">'+R(-30,90,310,30,'#FFD54A',0,`stroke="${INK}" stroke-width="3"`)+T(123,112,18,INK,'受害者 · VICTIM · 受害者')+'</g>'
};
const fw=(x,y,c)=>N(12,i=>{const a=i/12*6.283;return P(`M${(x+Math.cos(a)*8).toFixed(1)} ${(y+Math.sin(a)*8).toFixed(1)}L${(x+Math.cos(a)*22).toFixed(1)} ${(y+Math.sin(a)*22).toFixed(1)}`,'none',`stroke="${c}" stroke-width="3"`);})+C(x,y,3,c,NS);
const ROOM={
'麻将房':()=>G(R(-5,-5,260,160,'#BDE8D2',0,NS)+N(13,i=>R(i*20,0,8,150,'#A8DDC2',0,NS))+R(-5,150,260,70,'#B86B3A')+P('M0 172H246M0 192H246','none','stroke-width="2" opacity=".4"')+
  P('M24 18H64M24 92H64','none','stroke-width="5"')+R(28,20,32,70,'#fff',2)+T(44,66,28,'#E8483B','发')+
  P('M123 0V18')+E(123,38,24,19,'#E8483B')+P('M123 20V56','none','stroke-width="2"')+R(112,16,22,6,'#FFD54A',2)+R(112,54,22,6,'#FFD54A',2)+P('M123 60V74','none','stroke="#FFD54A" stroke-width="4"')+
  C(206,44,18,'#fff')+P('M206 44V32M206 44L214 48','none','stroke-width="3"')+
  E(24,182,18,7,'#E59A5F')+R(18,186,12,22,'#E59A5F')+E(222,182,18,7,'#E59A5F')+R(216,186,12,22,'#E59A5F')+
  R(42,176,10,32,'#8B4A2B')+R(194,176,10,32,'#8B4A2B')+P('M58 122H188L216 170H30Z','#2FA37C')+P('M70 128H176L196 162H50Z','#7FD3A8','stroke-width="2"')+R(30,170,186,10,'#8B4A2B',2)+
  N(10,i=>R(68+i*11,106,10,18,'#fff',2,'stroke-width="2"')+R(68+i*11,119,10,5,'#2FA37C',0,NS))+N(11,i=>R(46+i*14,160,13,8,'#fff',2,'stroke-width="2"'))+
  R(96,138,12,9,'#FFD54A',2,'stroke-width="2"')+R(112,142,12,9,'#fff',2,'stroke-width="2"')+R(128,134,12,9,'#fff',2,'stroke-width="2"')+
  R(152,134,11,11,'#fff',2,'stroke-width="2" transform="rotate(20 157 139)"')+C(155,137,1.5,'#E8483B',NS)+C(160,142,1.5,'#E8483B',NS)),
'神台':()=>R(0,0,246,160,'#E8483B')+dotPat('#FFD54A',14,1.6,.45,246,150)+G(R(-5,150,260,70,'#8B4A2B')+
  R(6,14,20,128,'#C62E22')+R(220,14,20,128,'#C62E22')+['福','寿','安','康'].map((c,i)=>T(16,42+i*28,15,'#FFD54A',c)).join('')+['吉','祥','如','意'].map((c,i)=>T(230,42+i*28,15,'#FFD54A',c)).join('')+
  P('M62 22H184L174 12H72Z','#8B4A2B')+R(68,22,110,74,'#5A2E1A',3)+R(106,28,34,42,'#FFD54A',3)+T(123,46,13,'#E8483B','祖')+T(123,64,13,'#E8483B','先')+
  P('M114 82V66M123 82V62M132 82V66','none','stroke="#8B4A2B" stroke-width="2.5"')+P('M134 64Q146 54 148 42Q150 30 160 22','none','stroke="#fff" stroke-width="2"')+P('M106 80H140L136 96H110Z','#FFD54A')+
  R(48,70,8,26,'#E8483B',2)+E(52,64,4,7,'#FFD54A','stroke-width="2"')+R(190,70,8,26,'#E8483B',2)+E(194,64,4,7,'#FFD54A','stroke-width="2"')+
  R(30,96,186,12,'#5A2E1A',2)+R(40,108,166,100,'#8B4A2B',3)+P('M40 140H206M123 108V140','none','stroke-width="2.5"')+C(110,124,3,'#FFD54A','stroke-width="1.5"')+C(136,124,3,'#FFD54A','stroke-width="1.5"')+
  R(70,152,106,40,'#C62E22',3)+T(123,181,22,'#FFD54A','福')+
  [[76,88],[90,88],[83,76],[156,88],[170,88],[163,76]].map(([x,y])=>C(x,y,8,'#FF9A3C','stroke-width="2.5"')).join('')),
'书房':()=>G(R(-5,-5,260,160,'#9DB8F2',0,NS)+R(-5,150,260,70,'#6B4A3A')+
  R(150,18,76,62,'#1E2A5A',4)+C(204,38,10,'#FFD54A',NS)+C(209,35,9,'#1E2A5A',NS)+C(166,30,1.5,'#fff',NS)+C(176,60,1.5,'#fff',NS)+P('M188 18V80M150 49H226','none','stroke-width="3"')+
  R(8,24,74,160,'#B86B3A',3)+[0,1,2,3].map(s=>{let x=12,o='';const cs=['#E8483B','#FFD54A','#2FA37C','#FFF7EC','#5B8DEF','#FF9A3C'];[7,10,6,9,8,11,7].forEach((w,i)=>{if(x+w>78)return;const h=26+((i*7+s*3)%8);o+=R(x,28+s*40+34-h,w,h,cs[(i+s)%6],1,'stroke-width="1.5"');x+=w+1;});return o;}).join('')+
  P('M8 64H82M8 104H82M8 144H82','none','stroke-width="3"')+
  R(100,140,58,58,'#555',5)+R(106,146,46,46,'#6E6E6E',3,'stroke-width="2"')+C(129,169,11,'#C9C2B8')+P('M129 160V164','none','stroke-width="2"')+R(144,160,4,18,'#C9C2B8',2,'stroke-width="1.5"')+
  R(196,130,38,74,'#8B4A2B',2)+P('M196 154H234M196 178H234','none','stroke-width="2.5"')+C(215,142,2.5,'#FFD54A',NS)+C(215,166,2.5,'#FFD54A',NS)+R(92,118,148,12,'#8B4A2B',2)+
  P('M106 96L92 118H144L130 96Z','#FFF7C9',NS+' opacity=".6"')+P('M118 118V96','none','stroke-width="3"')+P('M106 96H130L124 80H112Z','#2FA37C')+
  R(144,102,40,16,'#FFF7EC',2,'stroke-width="2" transform="rotate(-6 164 110)"')+T(164,115,10,'#E8483B','地契','transform="rotate(-6 164 110)"')+
  R(206,100,14,18,'#E8483B',2,'stroke-width="2"')+P('M210 100L206 88M216 100L220 90','none','stroke-width="2"')),
'客厅':()=>G(R(-5,-5,260,160,'#FFF1C9',0,NS)+R(-5,150,260,70,'#E8B07A')+P('M0 172H246M0 194H246','none','stroke-width="2" opacity=".4"')+
  R(8,10,18,100,'#E8483B')+['新','年','快','乐'].map((c,i)=>T(17,32+i*24,14,'#FFD54A',c)).join('')+
  R(108,12,30,30,'#E8483B',2,'transform="rotate(45 123 27)"')+T(123,22,18,'#FFD54A','福','transform="rotate(180 123 28)"')+
  P('M76 0V14')+E(76,26,12,11,'#E8483B')+R(70,13,12,4,'#FFD54A',1,'stroke-width="2"')+R(70,35,12,4,'#FFD54A',1,'stroke-width="2"')+
  R(12,96,112,52,'#9DB8F2',12)+R(6,128,124,32,'#9DB8F2',8)+R(2,112,18,52,'#7FA3EE',8)+R(116,112,18,52,'#7FA3EE',8)+R(24,104,40,30,'#FFD54A',8)+R(70,104,40,30,'#FF9A3C',8)+R(16,164,8,12,INK)+R(112,164,8,12,INK)+
  R(142,124,96,40,'#B86B3A',3)+P('M190 124V164','none','stroke-width="2.5"')+C(184,144,2.5,INK,NS)+C(196,144,2.5,INK,NS)+
  P('M180 116L176 124M200 116L204 124')+R(146,54,88,62,INK,5)+R(152,60,76,50,'#5B8DEF',2,NS)+T(190,92,18,'#FFD54A','春晚')+
  R(70,186,8,20,'#8B4A2B')+R(170,186,8,20,'#8B4A2B')+E(124,186,62,12,'#B86B3A')+C(108,182,13,'#E8483B')+C(108,182,7,'#FFD54A','stroke-width="2"')+C(142,182,7,'#FF9A3C','stroke-width="2.5"')+C(155,184,7,'#FF9A3C','stroke-width="2.5"')),
'饭厅':()=>G(R(-5,-5,260,160,'#FFD8A8',0,NS)+R(-5,150,260,70,'#B86B3A')+
  R(170,20,62,44,'#fff',3)+P('M184 40Q196 28 210 40Q196 52 184 40Z','#FF9A3C','stroke-width="2"')+P('M210 40L220 32V48Z','#FF9A3C','stroke-width="2"')+T(201,59,9,'#E8483B','年年有余')+
  R(12,30,40,56,'#E8483B',2)+T(32,66,24,'#FFD54A','春')+
  P('M86 48L56 116H190L160 48Z','#FFF7C9',NS+' opacity=".6"')+P('M123 0V26')+P('M100 26H146L160 48H86Z','#2FA37C')+
  [44,92,154,202].map(x=>R(x-12,92,24,44,'#8B4A2B',6)).join('')+
  P('M24 136Q30 198 123 198Q216 198 222 136Z','#E8483B')+E(123,134,100,26,'#E8483B')+P('M24 138Q123 186 222 138','none','stroke="#FFD54A" stroke-width="3"')+
  E(123,130,48,13,'#fff')+E(123,128,26,8,'#C9F0DC','stroke-width="2"')+P('M106 128Q118 120 132 128Q118 136 106 128Z','#FF9A3C','stroke-width="2"')+P('M132 128L140 122V134Z','#FF9A3C','stroke-width="2"')+
  [[48,140],[80,150],[166,150],[198,140]].map(([x,y])=>E(x,y,11,5,'#fff','stroke-width="2"')+C(x,y-3,5,'#fff','stroke-width="1.5"')+P(`M${x+12} ${y+2}L${x+24} ${y-6}M${x+14} ${y+4}L${x+26} ${y-3}`,'none','stroke="#8B4A2B" stroke-width="2"')).join('')),
'车房':()=>G(R(-5,-5,260,160,'#C9C2B8',0,NS)+R(-5,150,260,70,'#8A8F95')+E(70,192,28,6,'#5A5F66',NS)+
  R(8,16,74,130,'#E0D9CC',2)+N(9,i=>P(`M8 ${30+i*13}H82`,'none','stroke-width="2"'))+R(36,136,18,6,'#555',2,'stroke-width="2"')+
  R(176,16,62,58,'#E59A5F',3)+R(186,26,4,30,'#555',1,'stroke-width="2"')+R(180,22,16,8,'#555',1,'stroke-width="2"')+P('M206 30V60','none','stroke-width="4"')+C(206,26,5,'none','stroke-width="3"')+R(222,30,6,24,'#E8483B',2,'stroke-width="2"')+
  P('M100 100L114 66H170L184 100Z','#E8483B')+P('M110 96L120 72H164L174 96Z','#BDE8F5')+P('M126 76L134 92','none','stroke="#fff" stroke-width="3"')+
  R(84,96,116,52,'#E8483B',14)+C(102,116,10,'#FFD54A')+C(182,116,10,'#FFD54A')+R(124,108,36,18,'#555',3)+P('M131 108V126M138 108V126M145 108V126M152 108V126','none','stroke-width="1.5"')+
  R(88,148,22,24,INK,4)+R(174,148,22,24,INK,4)+R(80,138,124,14,'#C9C2B8',6)+R(120,141,44,10,'#fff',2,'stroke-width="2"')+T(142,149.5,8,INK,'CNY 888')+
  R(16,128,34,26,'#E59A5F',2)+T(33,146,10,INK,'CNY')+R(10,154,46,40,'#E59A5F',2)+P('M10 168H56M33 154V194','none','stroke-width="2"')),
'厨房':()=>G(R(-5,-5,260,140,'#FFE3CF',0,NS)+N(12,i=>P(`M${i*22} 0V124`,'none','stroke="#F5C9A8" stroke-width="1.5"'))+N(6,i=>P(`M0 ${i*22}H246`,'none','stroke="#F5C9A8" stroke-width="1.5"'))+
  R(-5,124,260,12,'#fff')+R(-5,136,260,80,'#9DB8F2')+P('M62 136V208M124 136V208M186 136V208','none','stroke-width="2.5"')+[52,72,114,134,176,196].map(x=>C(x,160,3,'#FFD54A','stroke-width="1.5"')).join('')+
  R(14,30,64,8,'#B86B3A',2)+R(22,36,8,6,'#8B4A2B')+R(16,42,20,24,'#C9C2B8',2)+P('M48 38L48 72L54 66L54 38Z','#C9C2B8')+P('M68 38V62','none','stroke-width="3"')+E(68,66,6,4,'#C9C2B8')+
  R(14,88,40,16,'#E59A5F',4)+R(14,104,40,16,'#E59A5F',4)+E(34,86,20,5,'#E59A5F')+P('M14 96H54M14 112H54','none','stroke-width="1.5"')+
  P('M150 10Q180 20 210 10','none','stroke-width="2"')+[156,168,180,192,204].map(x=>P(`M${x} 15Q${x+3} 34 ${x} 46`,'none','stroke-width="10"')+P(`M${x} 15Q${x+3} 34 ${x} 46`,'none','stroke="#A33A2A" stroke-width="6"')).join('')+
  P('M112 92Q106 80 114 70Q120 62 114 52M140 92Q134 80 142 70','none','stroke="#fff" stroke-width="3"')+
  R(84,112,86,14,'#555',3)+P('M108 112Q112 102 118 110Q123 98 128 110Q134 102 140 112Z','#FF9A3C','stroke-width="2"')+
  P('M82 96Q127 134 172 96Z',INK)+P('M172 98L198 90','none','stroke-width="6"')+C(112,101,5,'#FF9A3C',NS)+C(127,104,5,'#2FA37C',NS)+C(142,101,5,'#E8483B',NS)+
  E(214,116,20,8,'#fff')+C(208,110,6,'#FF9A3C','stroke-width="2"')+C(220,111,6,'#FF9A3C','stroke-width="2"')),
'后院':()=>G(R(-5,-5,260,140,'#1E2A5A',0,NS)+[[20,20],[90,14],[150,46],[232,70],[60,74],[120,10],[214,10]].map(([x,y])=>C(x,y,1.8,'#fff',NS)).join('')+fw(56,40,'#FFD54A')+fw(190,32,'#E8483B')+fw(130,24,'#7FD3A8')+
  R(-5,120,260,100,'#7FD3A8')+N(13,i=>P(`M${i*20+4} 128V86L${i*20+12} 78L${i*20+20} 86V128Z`,'#FFF7EC','stroke-width="2.5"'))+R(-5,98,260,8,'#FFF7EC',0,'stroke-width="2.5"')+
  P('M0 60Q123 104 246 60','none','stroke-width="2"')+[.12,.3,.5,.7,.88].map(t=>{const x=246*t,y=(1-t)*(1-t)*60+2*(1-t)*t*104+t*t*60;return E(x.toFixed(1),(y+8).toFixed(1),6,7,'#E8483B','stroke-width="2"');}).join('')+
  R(26,160,6,32,'#8B4A2B')+R(78,160,6,32,'#8B4A2B')+R(18,150,74,10,'#B86B3A',2)+E(46,142,12,9,'#fff')+P('M58 140L66 134','none','stroke-width="3"')+R(68,142,10,8,'#fff',2,'stroke-width="2"')+
  [[110,190],[128,182],[140,196],[100,178]].map(([x,y],i)=>R(x,y,8,4,'#E8483B',1,`stroke-width="1.5" transform="rotate(${i*40} ${x} ${y})"`)).join('')+
  C(193,118,40,'#2FA37C')+R(160,158,66,10,'#8B4A2B',2)+R(166,168,54,36,'#B86B3A',3)+T(193,192,14,'#FFD54A','吉')+
  [[176,104],[200,94],[214,122],[184,134],[206,140],[172,124],[194,116]].map(([x,y])=>C(x,y,6,'#FF9A3C','stroke-width="2"')).join('')+R(198,100,6,9,'#E8483B',1,'stroke-width="1.5"')),
};
const OBJ={
'六万':()=>rays('#FFE3CF','#FFD0B0')+G('<g transform="rotate(-8 123 104)">'+E(130,186,60,10,INK,NS+' opacity=".2"')+R(90,36,80,120,'#2FA37C',14)+R(80,28,80,120,'#fff',14)+R(88,36,64,104,'none',8,'stroke-width="2" stroke-dasharray="3 5"')+T(120,82,46,INK,'六')+T(120,132,46,'#E8483B','萬')+'</g>'+
  P('M42 52L60 62M38 86H58M44 116L62 106M204 52L186 62M208 86H188M204 116L186 106','none','stroke-width="4"')),
'红包':()=>rays('#FFE08A','#FFD54A')+G(R(122,40,78,122,'#C62E22',8,'transform="rotate(14 160 102)"')+
  R(62,28,88,136,'#E8483B',8)+P('M62 38Q106 84 150 38','#C62E22')+R(70,36,72,120,'none',4,'stroke="#FFD54A" stroke-width="2"')+C(106,76,18,'#FFD54A')+T(106,84,20,'#E8483B','福')+T(106,134,18,'#FFD54A','大吉')+
  [[54,182],[86,190],[168,180],[194,192],[140,194]].map(([x,y])=>E(x,y,14,8,'#FFD54A')+R(x-3,y-2,6,4,'#E59A5F',0,'stroke-width="1.5"')).join('')+star(196,40,14,6,4,'#fff','stroke-width="2"')),
'鞭炮':()=>rays('#FFE3CF','#FFD0B0')+G(P('M123 30V200','none','stroke-width="3"')+
  N(8,i=>{const y=46+i*19,s=i%2?1:-1,x0=s>0?123:85;return `<g transform="rotate(${s*18} 123 ${y})">`+R(x0,y-7,38,14,'#E8483B',4)+R(s>0?x0+30:x0,y-7,8,14,'#FFD54A',2)+'</g>';})+
  P('M123 30L111 20M123 30L135 20','none','stroke="#FFD54A" stroke-width="5"')+C(123,30,5,'#FFD54A')+P('M123 26Q132 14 140 16','none','stroke-width="3"')+star(146,14,14,6,6,'#FFD54A')+
  star(198,172,30,16,10,'#FFD54A')+T(198,180,20,'#E8483B','啪!')),
'年糕':()=>rays('#FFF1C9','#FFE3A0')+G(E(123,172,92,18,'#fff')+P('M46 168L34 150L62 156L68 138L92 150L110 136L123 150L136 136L154 150L176 138L182 156L210 150L198 168Z','#2FA37C')+
  P('M64 106V148Q123 176 182 148V106Z','#8B4A2B')+E(123,106,59,20,'#B86B3A')+E(123,104,44,13,'none','stroke="#D98A55" stroke-width="2"')+C(110,102,11,'#E8483B')+T(110,108,13,'#FFD54A','福')+
  E(144,100,8,5,'#A3201A')+P('M150 96l6-4','none','stroke-width="2"')+P('M82 140Q84 158 78 164','none','stroke="#5A2E1A" stroke-width="4"')+
  P('M178 182L210 172L216 188L184 198Z','#8B4A2B')+P('M178 182L210 172L206 166L176 176Z','#B86B3A')),
'橘子':()=>rays('#FFF1C9','#FFE08A')+G(E(123,188,86,10,INK,NS+' opacity=".18"')+
  C(162,134,40,'#FF9A3C')+P('M162 94Q166 86 162 82','none','stroke="#8B4A2B" stroke-width="3"')+P('M164 92Q184 74 198 88Q182 100 164 92Z','#2FA37C')+
  C(94,120,52,'#FF9A3C')+E(76,98,12,8,'#FFD0A0',NS+' opacity=".8"')+[[110,100],[120,124],[84,140],[104,150],[70,124]].map(([x,y])=>C(x,y,1.6,'#E07F24',NS)).join('')+
  P('M94 68Q96 58 92 52','none','stroke="#8B4A2B" stroke-width="3"')+P('M96 66Q74 42 58 56Q76 72 96 66Z','#2FA37C')+P('M98 66Q124 46 138 62Q118 76 98 66Z','#2FA37C')+
  R(118,142,30,30,'#E8483B',2,'transform="rotate(45 133 157)"')+T(133,163,15,'#FFD54A','吉')+
  P('M190 192Q198 172 208 192Z','#FFB45E','stroke-width="2.5"')+P('M206 192Q214 172 224 192Z','#FFB45E','stroke-width="2.5"')),
'筷子':()=>rays('#E0D9CC','#CFC6B7')+G(P('M112 22L117 120M138 22L131 120','none','stroke-width="10"')+P('M112 22L117 120M138 22L131 120','none','stroke="#E8483B" stroke-width="5"')+
  P('M112 22L113 40M138 22L137 40','none','stroke="#FFD54A" stroke-width="5"')+
  [[94,120],[108,110],[124,106],[140,110],[154,118],[122,118],[102,124],[146,124]].map(([x,y])=>C(x,y,14,'#fff','stroke-width="2.5"')).join('')+
  P('M64 122H182Q178 178 123 184Q68 178 64 122Z','#FFF7EC')+P('M74 142Q123 158 172 142','none','stroke="#5B8DEF" stroke-width="3"')+[90,110,136,156].map(x=>C(x,164,3,'#5B8DEF',NS)).join('')+R(104,182,38,10,'#FFF7EC',3)+
  P('M44 70q8-8 0-16M202 70q-8-8 0-16M36 110q8-8 0-16','none','stroke-width="3"'))
};
const BACK=()=>R(0,0,252,352,'#E8483B')+dotPat('#FFD54A',22,3,1,252,352)+G(R(14,14,224,324,'none',12,'stroke="#FFD54A" stroke-width="4" stroke-dasharray="0.1 9"')+R(24,24,204,304,'none',10,'stroke-width="3"')+
  R(110,36,32,42,'#fff',6)+T(126,66,22,'#E8483B','中')+'<g transform="rotate(180 126 296)">'+R(110,274,32,42,'#fff',6)+T(126,304,22,'#E8483B','中')+'</g>'+
  C(126,176,80,'#FFF7EC')+C(126,176,68,'none','stroke="#E8483B" stroke-width="3" stroke-dasharray="2 7"')+
  P('M138 166L160 188','none','stroke-width="11"')+P('M138 166L160 188','none','stroke="#B86B3A" stroke-width="6"')+C(118,146,26,'#BDE8F5')+T(118,158,34,'#E8483B','?')+T(126,222,22,INK,(window.GA_LANG==='en'?'Who killed the guest?':'谁杀了客人？')));
const svgEl=(inner,vb='0 0 246 208')=>React.createElement('svg',{viewBox:vb,width:'100%',height:'100%',preserveAspectRatio:'xMidYMid slice',style:{display:'block'},dangerouslySetInnerHTML:{__html:inner}});
const CARDS={
  sus:[['S01','二叔','2nd Uncle','#2E8A5E','Lost big at last night\u2019s mahjong. Owes 大伯 money.','“我只是来拜年的！”'],['S02','大姑','Big Aunt','#8A4FB0','Eldest sister. Has always wanted the family house.','“这个家我说了算。”'],['S03','表哥','Cousin','#5B8DEF','Never looks up from his phone. Or does he?','“我在打游戏啦～”'],['S04','大嫂','Sister-in-law','#E07AA0','Cooked the reunion dinner. Knows every knife in the kitchen.','“饭快好了！”'],['S05','姑丈','Uncle-in-law','#7C8085','Quiet and polite. Sweating a lot tonight.','“我什么都没看到…”'],['S06','伯母','Big Aunty','#C9A04A','大伯’s wife. First to find the body, or so she says.','“红包呢？”']],
  room:[['R01','麻将房','Mahjong Room','Where the tiles never stop clacking.'],['R02','神台','Ancestral Altar','Incense burning, ancestors watching.'],['R03','书房','Study','The house deed is kept in the safe.'],['R04','客厅','Living Room','春晚 on TV, too loud to hear a scream.'],['R05','饭厅','Dining Room','Reunion dinner, one seat empty.'],['R06','车房','Garage','Someone left the engine warm.'],['R07','厨房','Kitchen','Something is still boiling.'],['R08','后院','Backyard','Firecrackers cover every sound.']],
  obj:[['O01','六万','Mahjong Tile','Missing from the winning hand.'],['O02','红包','Red Packet','Heavier than it should be.'],['O03','鞭炮','Firecracker','One string never went off.'],['O04','年糕','Nian Gao','Sticky enough to choke on.'],['O05','橘子','Mandarin','A gift of gold, or a bribe?'],['O06','筷子','Chopsticks','Stuck upright in the rice. Bad luck.']]
};
const SUS=['二叔','大姑','表哥','大嫂','姑丈','伯母'];
const ROOMS=['麻将房','神台','书房','客厅','饭厅','车房','厨房','后院'];
const OBJS=['六万','红包','鞭炮','年糕','橘子','筷子'];
const CH={'二叔':{c:'#2E8A5E',g:'叔',en:'2nd Uncle'},'大姑':{c:'#8A4FB0',g:'姑',en:'Big Aunt'},'表哥':{c:'#5B8DEF',g:'哥',en:'Cousin'},'大嫂':{c:'#E07AA0',g:'嫂',en:'Sister-in-law'},'姑丈':{c:'#7C8085',g:'丈',en:'Uncle-in-law'},'伯母':{c:'#C9A04A',g:'母',en:'Big Aunty'}};
const ROOM_EN={'麻将房':'Mahjong Room','神台':'Altar','书房':'Study','客厅':'Living Room','饭厅':'Dining Room','车房':'Garage','厨房':'Kitchen','后院':'Backyard'};
const OBJ_EN={'六万':'Mahjong Tile','红包':'Red Packet','鞭炮':'Firecracker','年糕':'Nian Gao','橘子':'Mandarin','筷子':'Chopsticks'};
const kindOf=c=>SUS.includes(c)?'sus':ROOMS.includes(c)?'room':'obj';
const enOf=c=>CH[c]?CH[c].en:(ROOM_EN[c]||OBJ_EN[c]);
const MEMO={};const memo=(k,f)=>MEMO[k]||(MEMO[k]=f());
const cardArt=c=>memo('card'+c,()=>svgEl(kindOf(c)==='sus'?PORTRAIT[c]():kindOf(c)==='room'?ROOM[c]():OBJ[c]()));
const face=c=>memo('face'+c,()=>svgEl(PORTRAIT[c](),'58 28 130 130'));
const backArt=()=>memo('back'+window.GA_LANG,()=>svgEl(BACK(),'0 0 252 352'));
const sceneEl=(k,f,vb)=>memo('sc'+k,()=>svgEl(f(),vb||'0 0 640 360'));
const S3=(x,y,s,inner,ex='')=>'<g transform="translate('+x+' '+y+') scale('+s+')" '+ex+'>'+inner+'</g>';
const famF=(x,y,c,s=1,o)=>S3(x,y,s,P('M-30 62Q-32 6 0 2Q32 6 30 62Z',c)+C(0,-16,20,SKIN)+P('M-20 -20Q-18 -40 0 -40Q18 -40 20 -20Q8 -30 0 -28Q-8 -30 -20 -20Z',HAIR)+C(-7,-14,2.2,INK,NS)+C(7,-14,2.2,INK,NS)+(o?E(0,-3,3.5,4.5,INK,NS)+T(0,-50,26,'#E8483B','!'):P('M-6 -5Q0 0 6 -5','none','stroke-width="2"')),'stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"');
const famB=(x,y,c,s=1,blk)=>S3(x,y,s,P('M-30 62Q-32 6 0 2Q32 6 30 62Z',blk?'#000':c)+C(0,-16,20,blk?'#000':HAIR),blk?'':'stroke="'+INK+'" stroke-width="3"');
const uncB=(x,y,s=1,blk)=>S3(x,y,s,P('M-42 66Q-46 2 0 -2Q46 2 42 66Z',blk?'#000':'#E8483B')+C(0,-22,24,blk?'#000':SKIN)+(blk?'':P('M-22 -26Q-20 -36 -14 -40M22 -26Q20 -36 14 -40','none','stroke="#C9C2B8" stroke-width="5"')),blk?'':'stroke="'+INK+'" stroke-width="3"');
const uncF=(x,y,s=1,arm,dead)=>S3(x,y,s,(arm?P('M30 20L58 -26L68 -18L40 30Z',SKIN):'')+P('M-44 80Q-48 6 0 2Q48 6 44 80Z','#E8483B')+C(18,40,11,'#FFD54A')+T(18,45,12,'#E8483B','福')+C(0,-24,26,SKIN)+P('M-22 -34Q-24 -46 -16 -48M22 -34Q24 -46 16 -48','none','stroke="#C9C2B8" stroke-width="5"')+(dead?P('M-14 -32l8 8M-6 -32l-8 8M6 -32l8 8M14 -32l-8 8','none','stroke-width="2.5"'):P('M-12 -26Q-7 -31 -2 -26M2 -26Q7 -31 12 -26','none','stroke-width="2.5"')+P('M-10 -12Q0 -2 10 -12Z','#fff','stroke-width="2"')),'stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"');
const figure=(x,y,arm)=>S3(x,y,1,P('M-30 130L-24 10Q0 -6 24 10L30 130Z','#000')+C(0,-14,20,'#000')+R(-32,-32,64,7,'#000',2)+R(-18,-60,36,30,'#000',4)+E(-7,-12,4.5,2,'#fff')+E(7,-12,4.5,2,'#fff')+(arm?P('M18 14L50 -40L60 -32L30 22Z','#000'):P('M18 14L40 70L30 74L14 26Z','#000')));
const fwb=(x,y,c,d,r=46)=>'<g transform="translate('+x+' '+y+')"><g style="transform-box:fill-box;transform-origin:center;animation:burst 2s ease-out '+d+'s infinite both">'+N(14,i=>{const a=i/14*6.283;return P('M'+(Math.cos(a)*r*.25).toFixed(1)+' '+(Math.sin(a)*r*.25).toFixed(1)+'L'+(Math.cos(a)*r).toFixed(1)+' '+(Math.sin(a)*r).toFixed(1),'none','stroke="'+c+'" stroke-width="4" stroke-linecap="round"')+C((Math.cos(a)*r*1.15).toFixed(1),(Math.sin(a)*r*1.15).toFixed(1),2.5,c);})+'</g></g>';
const win=(fw=true)=>'<svg x="200" y="40" width="240" height="200" viewBox="0 0 240 200">'+R(0,0,240,200,'#1E2A5A')+N(9,i=>C((i*53)%240,((i*37)%120)+8,1.6,'#fff'))+(fw?fwb(72,70,'#FFD54A',0)+fwb(172,56,'#E8483B',.7)+fwb(125,120,'#7FD3A8',1.3,36):'')+'</svg>'+R(200,40,240,200,'none',0,'stroke="'+INK+'" stroke-width="8"')+P('M320 40V240M200 130H440','none','stroke="'+INK+'" stroke-width="6"');
const curtains=()=>R(168,30,32,226,'#E8483B',0,'stroke="'+INK+'" stroke-width="3"')+R(440,30,32,226,'#E8483B',0,'stroke="'+INK+'" stroke-width="3"');
const clock=(t)=>C(560,86,32,'#FFF7EC','stroke="'+INK+'" stroke-width="3"')+P(t==='1159'?'M560 86V62M560 86L556 64':'M560 86V60M560 86V62','none','stroke="'+INK+'" stroke-width="3" stroke-linecap="round"')+T(560,136,14,'#FFF7EC',t==='1159'?'11:59':'12:00');
const roomBg=lit=>R(0,0,640,360,lit?'#FFE3CF':'#3A2A2A')+(lit?N(16,i=>R(i*40+12,0,16,280,'#F5D3BC')):'')+R(0,280,640,80,lit?'#B86B3A':'#2A1E18');
const backs=blk=>famB(110,300,'#FF9A3C',.9,blk)+famB(170,296,CH['二叔'].c,1,blk)+famB(236,300,CH['大姑'].c,.95,blk)+famB(404,300,CH['大嫂'].c,.95,blk)+famB(470,296,CH['姑丈'].c,1,blk)+famB(532,300,CH['伯母'].c,.9,blk);

PORTRAIT['客人']=()=>rays('#F3EADB','#E8DCC4')+G(body('#F3EADB')+P('M104 150L123 196L142 150Z','#fff')+
  P('M104 150L92 172L110 176L123 200Z','#E0D3BA')+P('M142 150L154 172L136 176L123 200Z','#E0D3BA')+
  P('M110 158L123 166L110 174Z','#E8483B')+P('M136 158L123 166L136 174Z','#E8483B')+C(123,166,4,'#C62E22')+R(150,176,16,8,'#FFD54A',2,'stroke-width="2"')+
  P('M81 92Q78 50 123 48Q168 50 165 92Q150 62 100 66Q90 72 81 92Z',INK)+P('M118 55Q140 52 152 62','none','stroke="#fff" stroke-width="2.5"')+
  P('M96 84L116 86M130 86L150 84','none','stroke-width="4"')+C(107,99,11,'none','stroke="#FFD54A" stroke-width="3"')+C(139,99,11,'none','stroke="#FFD54A" stroke-width="3"')+P('M118 99h10','none','stroke="#FFD54A" stroke-width="3"')+
  dotEyes()+nose()+P('M108 120Q124 130 140 118')+
  R(160,150,48,44,'#E8483B',4)+P('M184 150V194M160 172H208','none','stroke="#FFD54A" stroke-width="5"')+P('M176 146Q184 134 184 150Q184 134 192 146','none','stroke="#FFD54A" stroke-width="3"')+hand(162,184));
const VICTIM=()=>PORTRAIT['客人']()+'<g transform="rotate(-14 123 104)">'+R(-30,90,310,30,'#FFD54A',0,'stroke="'+INK+'" stroke-width="3"')+T(123,112,18,INK,window.GA_LANG==='en'?'VICTIM · VICTIM · VICTIM':'受害者 · 受害者 · 受害者')+'</g>';
const guestF=(x,y,s=1,arm,dead,blk)=>S3(x,y,s,(arm?P('M30 20L58 -26L68 -18L40 30Z',blk?'#000':SKIN):'')+P('M-40 80Q-44 6 0 2Q44 6 40 80Z',blk?'#000':'#F3EADB')+
  (blk?'':P('M-10 6L0 14L-10 22Z','#E8483B')+P('M10 6L0 14L10 22Z','#E8483B'))+C(0,-24,24,blk?'#000':SKIN)+
  (blk?'':P('M-24 -28Q-24 -52 0 -52Q24 -52 24 -30Q12 -42 -14 -38Q-20 -36 -24 -28Z',INK)+C(-9,-24,7,'none','stroke="#FFD54A" stroke-width="2.5"')+C(9,-24,7,'none','stroke="#FFD54A" stroke-width="2.5"')+
    (dead?P('M-12 -28l6 6M-6 -28l-6 6M6 -28l6 6M12 -28l-6 6','none','stroke-width="2"'):C(-9,-24,2,INK,NS)+C(9,-24,2,INK,NS)+P('M-8 -10Q0 -4 8 -10','none','stroke-width="2.5"'))),
  blk?'':'stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"');
let FID=0;
const bust=(c,x,y,w)=>{NORAYS=true;const p=PORTRAIT[c]();NORAYS=false;return '<svg x="'+(x-w/2)+'" y="'+y+'" width="'+w+'" height="'+(w*208/246).toFixed(1)+'" viewBox="0 0 246 208">'+p+'</svg>';};
const ROW=[['表哥',86],['二叔',168],['大姑',248],['大嫂',392],['姑丈',472],['伯母',554]];
const row=(y,w,blk)=>{const inner=ROW.map(([c,x])=>bust(c,x,y,w)).join('');if(!blk)return inner;const id='fb'+(FID++);return '<defs><filter id="'+id+'"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter></defs><g filter="url(#'+id+')">'+inner+'</g>';};
const shocked=y=>ROW.map(([c,x])=>T(x,y,30,'#E8483B','!','stroke="'+INK+'" stroke-width="1.5"')).join('');
const EN=()=>window.GA_LANG==='en';

const L2=(zh,en)=>EN()?en:zh;
const pnl=(x,y,w,h,inner)=>'<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>'+R(x,y,w,h,'none',0,'stroke="'+INK+'" stroke-width="4"');
const rbg=(n,w,h)=>'<svg width="'+w+'" height="'+h+'" viewBox="0 0 246 208" preserveAspectRatio="xMidYMid slice">'+ROOM[n]()+'</svg>';
const bub=(x,y,w,h,txt,tx,ty,fs=15)=>{const up=ty<y,ey=up?y+2:y+h-2,cx=x+w/2;return G(P('M'+(cx-10)+' '+ey+'L'+tx+' '+ty+'L'+(cx+10)+' '+ey+'Z','#fff')+R(x,y,w,h,'#fff',Math.min(16,h/2)))+R(cx-9,up?y+1:y+h-7,18,6,'#fff',0,NS)+T(cx,y+h/2+fs*.36,fs,INK,txt);};
const sfx=(x,y,txt,fs,col,rot=0)=>'<g transform="translate('+x+' '+y+') rotate('+rot+')"><text x="0" y="0" font-size="'+fs+'" font-family="ZCOOL KuaiLe" text-anchor="middle" fill="'+col+'" stroke="'+INK+'" stroke-width="'+(fs/8).toFixed(1)+'" paint-order="stroke" stroke-linejoin="round">'+txt+'</text></g>';
const page=inner=>R(0,0,360,360,'#1B1B1B')+inner;
const eyes=(x,y,d)=>'<g style="animation:blink 2.4s ease-in-out '+d+'s infinite">'+E(x-6,y,4,6,'#fff')+E(x+6,y,4,6,'#fff')+C(x-5,y+1,1.6,INK)+C(x+7,y+1,1.6,INK)+'</g>';
const houseArt=()=>R(0,0,640,360,'#1E2A5A')+N(22,k=>C((k*97)%640,(k*53)%170,1.6,'#fff'))+C(520,66,28,'#FFF1C9')+C(532,60,26,'#1E2A5A')+G(R(160,136,320,224,'#E8483B')+P('M136 146L320 56L504 146Z','#8B4A2B')+
  [180,290,400].map(x=>R(x,170,60,56,'#FFD54A')+famB(x+30,214,'#000',.45,true)).join('')+
  R(285,250,70,110,'#5A2E1A')+R(305,270,30,30,'#FFD54A',2,'transform="rotate(45 320 285)"')+T(320,292,18,'#E8483B','福')+R(258,244,18,112,'#C62E22')+R(364,244,18,112,'#C62E22')+
  [190,450].map(x=>'<g style="transform-box:fill-box;transform-origin:50% 0%;animation:sway 2.6s ease-in-out infinite">'+P('M'+x+' 146V162')+E(x,180,18,16,'#E8483B')+R(x-9,162,18,5,'#FFD54A',1)+R(x-9,194,18,5,'#FFD54A',1)+'</g>').join(''))+R(0,346,640,14,'#141A3A');
const lighten=c=>c+'55';
function storyScene(i){
 if(i===0) return page(
  pnl(8,8,344,168,'<svg width="344" height="168" viewBox="110 40 420 205" preserveAspectRatio="xMidYMid slice">'+houseArt()+'</svg>'+sfx(250,40,L2('新年快乐！','Happy New Year!'),EN()?20:26,'#FFD54A',-6))+
  pnl(8,184,168,168,rbg('麻将房',168,168)+bust('二叔',52,84,96)+bust('姑丈',122,88,90)+sfx(84,52,L2('碰！','PUNG!'),EN()?26:34,'#FFD54A',-10))+
  pnl(184,184,168,168,rbg('厨房',168,168)+bust('大嫂',52,86,92)+bust('伯母',120,84,96)+bub(18,12,132,32,L2('开饭啦！','Dinner’s ready!'),70,82,15)));
 if(i===1) return page(
  pnl(8,8,168,344,R(0,0,168,344,'#FFD8A8')+N(9,k=>R(k*20+6,0,8,344,'#FFCB94',0,NS))+G(R(18,40,132,290,'#1E2A5A'))+N(10,k=>C(28+(k*37)%112,52+(k*29)%120,1.5,'#fff'))+C(120,74,14,'#FFF1C9')+
    bust('客人',84,196,150)+G(R(150,40,16,290,'#8B4A2B')+R(2,30,16,250,'#C62E22')+R(18,26,132,16,'#5A2E1A')+R(10,326,148,18,'#C9C2B8'))+T(10,70,13,'#FFD54A','春')+T(10,100,13,'#FFD54A','满')+T(10,130,13,'#FFD54A','门')+
    sfx(84,100,L2('叮咚！','DING DONG!'),EN()?22:32,'#FFD54A',-6))+
  pnl(184,8,168,168,rbg('客厅',168,168)+bust('大姑',58,86,96)+bust('表哥',122,96,80)+bub(20,10,128,32,L2('他是谁？','Who’s that?'),76,84,15))+
  pnl(184,184,168,168,'<svg width="168" height="168" viewBox="38 26 170 170" preserveAspectRatio="xMidYMid slice">'+PORTRAIT['客人']()+'</svg>'+bub(10,124,148,32,L2('老朋友，来拜年！','Just an old friend!'),84,100,14)));
 const ch=['二叔','大姑','表哥','大嫂','姑丈','伯母'], mk=['!?','……','?!','!','……!','?'];
 return page(pnl(8,8,344,170,rbg('饭厅',344,170)+'<rect width="344" height="170" fill="#000" opacity=".15"/>'+bust('客人',172,58,134)+bub(30,6,284,34,L2('我知道你们每个人的秘密。','I know every one of your secrets.'),172,58,EN()?14:16))+
  ch.map((c,k)=>{const x=8+(k%3)*114,y=186+Math.floor(k/3)*87;return pnl(x,y,108,79,R(0,0,108,79,lighten(CH[c].c))+N(8,j=>P('M54 40L'+(54+Math.cos(j*.785)*120).toFixed(0)+' '+(40+Math.sin(j*.785)*120).toFixed(0),'none','stroke="#fff" stroke-width="6" opacity=".5"'))+bust(c,54,6,86)+sfx(92,26,mk[k],18,'#E8483B',10));}).join(''));
}
function murderScene(i){
 if(i===0){ const rooms=[['书房',['表哥']],['后院',['二叔','大姑']],['客厅',['大嫂','伯母']],['神台',['姑丈']]];
  return page(rooms.map(([n,cs],k)=>{const x=8+(k%2)*176,y=8+Math.floor(k/2)*176;return pnl(x,y,168,168,rbg(n,168,168)+(n==='后院'?fwb(50,40,'#FFD54A',0,30)+fwb(120,30,'#E8483B',.6,26):'')+cs.map((c,j)=>bust(c,cs.length===1?84:52+j*66,cs.length===1?80:86,cs.length===1?104:88)).join(''));}).join('')+
   G(C(180,180,40,'#FFF7EC'))+P('M180 180V150M180 180V152','none','stroke="'+INK+'" stroke-width="4" stroke-linecap="round"')+T(180,198,13,INK,'12:00')+sfx(180,240,L2('三、二、一！','3, 2, 1!'),30,'#FFD54A',-4));}
 if(i===1) return page(pnl(8,8,344,344,R(0,0,344,344,'#3A2A2A')+G(P('M172 40V86')+E(172,130,46,52,'#FFF1C9')+R(152,176,40,26,'#C9C2B8',4))+P('M150 126Q172 100 194 126','none','stroke="#E59A5F" stroke-width="4"')+
  '<g style="animation:flicker 1.4s linear both">'+R(0,0,344,344,'#050507')+G(P('M172 40V86','none','stroke="#333"')+E(172,130,46,52,'#222'))+'</g>'+sfx(172,280,L2('啪嗒！','CLICK!'),48,'#FFFFFF',-6)));
 if(i===2) return page(pnl(8,8,344,344,R(0,0,344,344,'#050507')+R(250,20,70,110,'#1E2A5A')+fwb(285,60,'#E8483B',0,22)+
  [[60,80,0],[130,60,.4],[90,200,.8],[230,250,1.2],[300,190,.2],[180,300,1.6]].map(([x,y,d])=>eyes(x,y,d)).join('')+
  '<g style="animation:slideIn 2.2s ease-out both">'+figure(200,150,false)+'</g>'+sfx(172,330,L2('嘘……','Shhh…'),24,'#FFFFFF',0)));
 if(i===3) return page(pnl(8,8,344,344,R(0,0,344,344,'#FFD54A')+N(24,k=>{const t=k/24*6.283;return P('M172 172L'+(172+Math.cos(t)*260).toFixed(0)+' '+(172+Math.sin(t)*260).toFixed(0),'none','stroke="#1B1B1B" stroke-width="'+(k%2?2:5)+'"');})+
  '<g transform="translate(172 172)"><g style="transform-box:fill-box;transform-origin:center;animation:pop .4s ease-out both">'+star(0,0,120,64,14,'#fff','stroke="'+INK+'" stroke-width="5"')+sfx(0,24,L2('砰！','THUD!'),EN()?50:76,'#E8483B',-6)+'</g></g>')+R(0,0,360,360,'#fff',0,'style="animation:flash .7s ease-out both"'));
 if(i===4) return page(pnl(8,8,344,344,R(0,0,344,344,'#050507')+[[70,90],[260,80],[120,250],[250,260],[60,190],[300,170]].map(([x,y],k)=>'<g transform="translate('+x+' '+y+') scale(1.4)">'+eyes(0,0,0)+'</g>').join('')+
  '<g transform="translate(172 180)"><g style="animation:shake .3s linear infinite">'+sfx(0,0,L2('啊——！','AAAH!'),72,'#FFFFFF',-4)+'</g></g>'));
 const ch=['二叔','大姑','表哥','大嫂','姑丈','伯母'];
 return page(pnl(8,8,344,344,rbg('饭厅',344,344)+'<rect width="344" height="344" fill="#000" opacity=".12"/>'+G(R(146,150,52,70,'#8B4A2B',6))+sfx(172,196,'?',40,'#FFD54A',0)+
  ch.map((c,k)=>bust(c,30+k*57,262,74)).join('')+ch.map((c,k)=>sfx(30+k*57,262,'!',22,'#E8483B',0)).join('')+bub(70,14,204,40,L2('客人呢？','Where’s the guest?'),172,150,20)));
}
function story2Scene(i,order){
 if(i===0) return page(pnl(8,8,344,344,R(0,0,344,344,'#1E2A5A')+N(14,k=>C((k*71)%344,(k*37)%90+6,1.5,'#fff'))+
  G(R(40,40,264,170,'#E8483B')+R(122,80,100,130,'#5A2E1A')+R(100,72,16,138,'#C62E22')+R(228,72,16,138,'#C62E22')+R(10,210,324,24,'#C9C2B8')+R(-4,234,352,24,'#B0A99E')+R(-4,258,352,90,'#8A8F95'))+
  [80,264].map(x=>G(E(x,60,14,12,'#E8483B'))).join('')+
  P('M100 300C100 286 112 280 124 286L136 292L160 276L170 282L152 296L196 292L232 278L240 288L208 300L240 312L232 322L196 308L152 304L170 318L160 324L136 308L124 314C112 320 100 314 100 300Z','none','stroke="#fff" stroke-width="3" stroke-dasharray="7 5" stroke-linejoin="round"')+
  '<g transform="rotate(-18 262 296)">'+G(R(240,276,46,40,'#E8483B',4))+P('M263 276V316M240 296H286','none','stroke="#FFD54A" stroke-width="5"')+'</g>'+
  [[200,326],[226,334],[296,322]].map(([x,y])=>G(C(x,y,9,'#FF9A3C'))).join('')+
  pnl(214,100,122,96,R(0,0,122,96,'#FFF1C9')+bust('大嫂',36,14,72)+bust('二叔',90,18,68)+sfx(60,26,'!!',22,'#E8483B',0))));
 if(i===1) return page(pnl(8,8,344,344,R(0,0,344,344,'#B86B3A')+N(12,k=>P('M0 '+(k*30)+'H344','none','stroke="#8B4A2B" stroke-width="2"'))+
  P('M150 344C150 280 120 220 150 140S170 60 160 0M196 344C196 280 166 220 196 140S216 60 206 0','none','stroke="#5A2E1A" stroke-width="5" stroke-dasharray="14 10" opacity=".8"')+
  G(C(110,190,58,'#FFF7EC'))+'<svg x="52" y="132" width="116" height="116" viewBox="0 0 116 116">'+R(0,0,116,116,'#B86B3A')+P('M40 116C40 80 30 50 44 0M76 116C76 80 66 50 80 0','none','stroke="#5A2E1A" stroke-width="9" stroke-dasharray="16 8"')+'</svg>'+C(110,190,58,'none','stroke="'+INK+'" stroke-width="6"')+P('M150 232L196 280','none','stroke="'+INK+'" stroke-width="14" stroke-linecap="round"')+P('M150 232L196 280','none','stroke="#B86B3A" stroke-width="8" stroke-linecap="round"')+
  pnl(222,16,110,110,R(0,0,110,110,'#FFF7EC')+[0,1,2].map(r=>[0,1,2].map(c=>r===1&&c===1?R(39,39,32,32,'#E8483B',4):R(4+c*35,4+r*35,32,32,'#9DB8F2',4,'stroke="'+INK+'" stroke-width="2"')+T(20+c*35,27+r*35,18,'#E8483B','?')).join('')).join(''))));
 if(i===2) return page(order.map((c,k)=>{const x=8+(k%3)*116,y=8+Math.floor(k/3)*176;return pnl(x,y,112,168,'<svg width="112" height="132" viewBox="20 0 206 208" preserveAspectRatio="xMidYMid slice">'+PORTRAIT[c]()+'</svg>'+R(0,132,112,36,'#FFF7EC')+P('M0 132H112','none','stroke="'+INK+'" stroke-width="3"')+T(56,157,EN()?13:20,INK,EN()?enOf(c):c)+G(C(16,16,11,'#FFD54A'))+'<text x="16" y="21" font-size="13" text-anchor="middle" font-family="Fredoka" font-weight="700">'+(k+1)+'</text>');}).join(''));
 return page(pnl(8,8,344,344,R(0,0,344,344,'#2FA37C')+dotPat('#1B1B1B',16,1.6,.25,344,344)+[0,1,2].map(k=>'<g transform="translate('+(18+k*106)+' 70)"><g style="animation:bob 1.6s ease-in-out '+(k*.25)+'s infinite"><svg width="96" height="134" viewBox="0 0 252 352">'+BACK()+'</svg></g>'+T(48,180,EN()?16:22,'#FFF7EC',EN()?['WHO?','WHERE?','WITH WHAT?'][k]:['谁？','在哪里？','用什么？'][k])+'</g>').join('')));
}
const cb=(x,y,rot=0,w=60)=>'<g transform="translate('+x+' '+y+') rotate('+rot+')"><svg x="'+(-w/2)+'" y="'+(-w*.7)+'" width="'+w+'" height="'+(w*1.4)+'" viewBox="0 0 252 352">'+BACK()+'</svg></g>';
const env=(x,y,sealed,anim)=>'<g transform="translate('+x+' '+y+')">'+G(R(-65,-42,130,84,'#FFF7EC',6)+P('M-65 -42L0 4L65 -42'))+(sealed?'<g style="transform-box:fill-box;transform-origin:center;animation:'+(anim||'none')+'">'+G(C(0,4,18,'#E8483B'))+T(0,11,18,'#fff','密')+'</g>':'')+'</g>';
function setupScene(i,order){
 const bg=R(0,0,640,360,'#2FA37C')+dotPat('#1B1B1B',16,1.6,.2,640,360);
 const piles=(top)=>[[190,'嫌疑人','Suspects','6'],[320,'地点','Rooms','8'],[450,'物品','Objects','6']].map(([x,l,le,n])=>N(top?4:3,k=>cb(x-k*2,112-k*3,0,64))+T(x,184,18,'#FFF7EC',window.GA_LANG==='en'?le:l)+T(x,204,13,'#FFF7EC',window.GA_LANG==='en'?n+' cards':n+' 张')).join('');
 if(i===0) return bg+piles(true)+env(320,282,false);
 if(i===1) return bg+'<style>@keyframes sfa{0%{transform:translate(-130px,-166px)}80%{transform:translate(0,-8px) scale(.7);opacity:1}100%{transform:translate(0,6px) scale(.6);opacity:0}}@keyframes sfb{0%{transform:translate(0,-166px)}80%{transform:translate(0,-8px) scale(.7);opacity:1}100%{transform:translate(0,6px) scale(.6);opacity:0}}@keyframes sfc{0%{transform:translate(130px,-166px)}80%{transform:translate(0,-8px) scale(.7);opacity:1}100%{transform:translate(0,6px) scale(.6);opacity:0}}</style>'+piles(false)+env(320,282,false)+
  ['sfa','sfb','sfc'].map((k,j)=>'<g transform="translate(320 270)"><g style="animation:'+k+' .9s ease-in '+(.3+j*.6)+'s both">'+cb(0,0,0,64)+'</g></g>').join('')+env(320,282,true,'pop .4s ease-out 2.4s both');
 const seats=order.map((c,k)=>{const a=(-90+k*60)*Math.PI/180;return [320+Math.cos(a)*170,178+Math.sin(a)*122,c];});
 let st='<style>';const fl=[];
 for(let j=0;j<17;j++){const [sx,sy]=seats[j%6],dx=(sx-320)*.72+(Math.floor(j/6)-1)*8,dy=(sy-178)*.72;st+='@keyframes dl'+j+'{0%{transform:translate(0,0)}100%{transform:translate('+dx.toFixed(0)+'px,'+dy.toFixed(0)+'px) rotate('+((j*37)%30-15)+'deg)}}';fl.push('<g transform="translate(320 178)"><g style="animation:dl'+j+' .45s ease-out '+(.2+j*.14)+'s both">'+cb(0,0,0,30)+'</g></g>');}
 st+='</style>';
 return bg+st+N(3,k=>cb(320-k*2,178-k*2,0,44))+fl.join('')+seats.map(([x,y,c])=>G(C(x.toFixed(0),y.toFixed(0),22,CH[c].c))+'<text x="'+x.toFixed(0)+'" y="'+(y+7).toFixed(0)+'" font-size="20" fill="#fff" text-anchor="middle" font-family="Noto Serif SC" font-weight="900">'+CH[c].g+'</text>').join('');
}
function envScene(i){
 const bg=R(0,0,640,360,'#0B0B10')+E(320,200,220,150,'#2A2320');
 if(i===0) return bg+'<g transform="translate(320 200) scale(1.7)"><g style="animation:shake .45s linear infinite">'+env(0,0,true)+'</g></g>';
 return bg+'<g transform="translate(320 220) scale(1.7)">'+[-34,0,34].map((x,k)=>'<g style="animation:fadeUp .5s ease-out '+(.3+k*.2)+'s both">'+cb(x,-46,(k-1)*10,40)+'</g>').join('')+G(R(-65,-42,130,84,'#FFF7EC',6))+'<g style="animation:tear .7s ease-in both">'+G(P('M-65 -42L0 4L65 -42Z','#FFF7EC'))+'</g></g>';
}
function qr(){let s=R(0,0,250,250,'#fff');const u=10,o=20;for(let y=0;y<21;y++)for(let x=0;x<21;x++){if((x<8&&y<8)||(x>12&&y<8)||(x<8&&y>12))continue;if(((x*7+y*13+x*y)%5)<2)s+=R(o+x*u,o+y*u,u,u,INK);}[[0,0],[14,0],[0,14]].forEach(([a,b])=>{s+=R(o+a*u,o+b*u,70,70,INK)+R(o+a*u+10,o+b*u+10,50,50,'#fff')+R(o+a*u+20,o+b*u+20,30,30,INK);});return s;}
window.GA={SUS,ROOMS,OBJS,CH,ROOM_EN,OBJ_EN,kindOf,enOf,cardArt,face,backArt,roomArt:c=>memo('room'+c,()=>svgEl(ROOM[c]())),scene:sceneEl,storyScene,murderScene,story2Scene,setupScene,envScene,qrEl:()=>memo('qr',()=>svgEl(qr(),'0 0 250 250')),victimArt:()=>memo('victim'+window.GA_LANG,()=>svgEl(VICTIM())),guestArt:()=>memo('guest',()=>svgEl(PORTRAIT['客人']()))};

})();
