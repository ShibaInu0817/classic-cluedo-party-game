(function(){
const ROOMS=['麻将房','神台','书房','客厅','饭厅','车房','厨房','后院'];
const RB={'麻将房':[0,0],'神台':[1,0],'书房':[2,0],'客厅':[0,1],'饭厅':[2,1],'车房':[0,2],'厨房':[1,2],'后院':[2,2]};
const SECRET={'麻将房':'后院','后院':'麻将房','书房':'车房','车房':'书房'};
const STARTS={'表哥':'3,0','大嫂':'7,0','二叔':'10,3','伯母':'10,7','姑丈':'7,10','大姑':'0,7'};
const isCor=(c,r)=>c===3||c===7||r===3||r===7;
const COR=[];for(let r=0;r<11;r++)for(let c=0;c<11;c++)if(isCor(c,r))COR.push(c+','+r);
const ADJ={};
COR.forEach(k=>{const [c,r]=k.split(',').map(Number);ADJ[k]=[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[c+a,r+b]).filter(([x,y])=>x>=0&&y>=0&&x<11&&y<11&&isCor(x,y)).map(([x,y])=>x+','+y);});
const DOORS=[];
ROOMS.forEach(n=>{const [i,j]=RB[n],bx=i*4,by=j*4,d=[];
  if(i<2){d.push((bx+3)+','+(by+1));DOORS.push([bx+3-.12,by+1.2,.24,.6]);}
  if(i>0){d.push((bx-1)+','+(by+1));DOORS.push([bx-.12,by+1.2,.24,.6]);}
  if(j<2){d.push((bx+1)+','+(by+3));DOORS.push([bx+1.2,by+3-.12,.6,.24]);}
  if(j>0){d.push((bx+1)+','+(by-1));DOORS.push([bx+1.2,by-.12,.6,.24]);}
  ADJ['R:'+n]=d;d.forEach(k=>ADJ[k].push('R:'+n));});
const DR={};(()=>{const q=[];ROOMS.forEach(n=>{DR['R:'+n]=0;q.push('R:'+n);});while(q.length){const u=q.shift();for(const v of ADJ[u])if(DR[v]===undefined){DR[v]=DR[u]+1;q.push(v);}}})();
function bfs(start,max){const dist={[start]:0},par={},q=[start];while(q.length){const u=q.shift();if(u!==start&&u.startsWith('R:'))continue;if(dist[u]>=max)continue;for(const v of ADJ[u])if(dist[v]===undefined){dist[v]=dist[u]+1;par[v]=u;q.push(v);}}return {dist,par};}
const pathTo=(par,start,t)=>{const p=[t];while(p[0]!==start)p.unshift(par[p[0]]);return p;};
const pct=v=>(v/11*100).toFixed(3)+'%';
function nodeXY(node,slot){
  if(node.startsWith('R:')){const [i,j]=RB[node.slice(2)],cx=i*4+1.5,cy=j*4+1.5,o=[[-.8,.25],[0,.25],[.8,.25],[-.8,1.0],[0,1.0],[.8,1.0]][slot%6];return [pct(cx+o[0]),pct(cy+o[1])];}
  const [c,r]=node.split(',').map(Number),o=[[0,0],[.2,.2],[-.2,-.2],[.2,-.2],[-.2,.2],[0,0]][slot%6];return [pct(c+.5+o[0]),pct(r+.5+o[1])];
}
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const FACE_ROT={1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]};
const diceFaces=h=>[[1,'translateZ('+h+'px)'],[6,'rotateY(180deg) translateZ('+h+'px)'],[3,'rotateY(90deg) translateZ('+h+'px)'],[4,'rotateY(-90deg) translateZ('+h+'px)'],[2,'rotateX(90deg) translateZ('+h+'px)'],[5,'rotateX(-90deg) translateZ('+h+'px)']].map(([n,tf])=>({tf,pc:(n===1||n===4)?'#E8483B':'#1B1B1B',pips:[0,1,2,3,4,5,6,7,8].map(i=>({op:PIPS[n].includes(i)?1:0}))}));
const diceRot=(v,k)=>{const [x,y]=FACE_ROT[v||1];return 'rotateX('+(k*720+x)+'deg) rotateY('+(k*720+y)+'deg)';};
const STORY1=[
 {cn:'大年初一晚上，全家回到老房子过年。',en:'On the first night of Chinese New Year, the whole family gathers at the old house.'},
 {cn:'门铃响了。一位没人认识的客人上门拜年，说自己是“老朋友”。',en:'The doorbell rings. A guest nobody recognises drops by, calling himself an “old friend”.'},
 {cn:'饭桌上，客人笑着说：“我知道你们每个人的秘密。”大家的脸色都变了。',en:'At dinner, the guest smiles: “I know every one of your secrets.” Nobody is smiling now.'}];
const MURDER=[
 {cn:'午夜放烟花，大家散在屋子各处。',en:'Midnight fireworks. Everyone is scattered around the house.'},
 {cn:'突然，整间屋子停电了。',en:'Suddenly, the whole house loses power.'},
 {cn:'黑暗中，有人在走动……',en:'In the dark, someone is moving…'},
 {cn:'砰！',en:'THUD!'},
 {cn:'“啊——！”',en:'A scream.'},
 {cn:'灯亮了。客人不见了！',en:'The lights come back on. The guest is gone!'}];
const MURDER_MS=[3400,1600,2600,1300,1500];
const STORY2=[
 {cn:'大家找遍屋子，最后在大门口的台阶上找到了客人。他已经没有呼吸。',en:'After searching the house, everyone finds the guest on the front steps. He isn’t breathing.'},
 {cn:'地上有拖动的痕迹：尸体是从屋里搬出来的。真正的案发地点，是屋里八个房间之一。',en:'Drag marks on the floor: the body was moved. He was killed in one of the eight rooms inside.'},
 {cn:'门窗都锁着，凶手就在你们六个人之中。',en:'The doors were locked all night. The killer is one of the six of you.'},
 {cn:'找出三件事：谁？在哪里？用什么？',en:'Find out three things: Who? Where? With what?'}];
const SETUP=[
 {cn:'洗牌：嫌疑人、地点、物品三叠牌。',en:'Shuffling the three piles: suspects, rooms and objects.'},
 {cn:'每叠抽一张，封进机密信封。这就是答案。',en:'One card from each pile goes into the secret envelope. That is the answer.'},
 {cn:'其余的牌发给每位玩家。',en:'The rest are dealt to every player.'}];
const NOTES={
 home:{what:'Home. The guest’s photo with the victim tape sets the tone. Create, join, or open the TV view.',sfx:'Lion-dance drum loop at low volume; gong hit on Create.',hap:'Light tap on every button.'},
 settings:{what:'Settings: sound, music, haptics, turn alerts and language. Saved per device.',sfx:'Short tick on each toggle.',hap:'Selection tick on toggle.'},
 create:{what:'Create room: name, max players, display mode (phones only or TV + phones), and bots for empty seats.',sfx:'Paper unfold when the sheet opens.',hap:'Medium tap on Create.'},
 lobby:{what:'Lobby: share code 8888 or scan the QR on the TV. Players join live; pick a character; bots fill empty seats. Host starts at 3+ players.',sfx:'Firecracker pop each time a player joins.',hap:'Light buzz when someone joins; double tap when the game starts.'},
 story1:{what:'Story, chapter 1. Shown on every phone and, in TV mode, big on the TV with subtitles. Anyone can tap Next; host can skip.',sfx:'Guzheng theme, dinner chatter, clinking bowls.',hap:'None.'},
 murder:{what:'Murder (comic noir, auto-plays): everyone scattered in different rooms at midnight, power cut, eyes in the dark and a moving shadow, THUD, scream, lights on and the guest is gone. No room or weapon is shown, so the mystery stays fair. Same character art as the cards.',sfx:'Fireworks, power-cut thunk, heartbeat, firecracker BANG, scream, record scratch.',hap:'Heartbeat pulses in the dark; one heavy hit on BANG.'},
 story2:{what:'Briefing: the body is found on the front steps (not a board room). Drag marks show it was moved, so the real room is unknown. The killer is one of the 6; find Who / Where / With what.',sfx:'Detective sting; drum roll on the 3 cards.',hap:'None.'},
 setup:{what:'Setup: one card per pile into the envelope, the rest dealt. Then each phone privately reveals your character and hand. The TV only shows who is ready.',sfx:'Card shuffle, envelope seal stamp, card flicks while dealing, flip sound on reveal.',hap:'Tick per card dealt to you; medium tap on reveal.'},
 game:{what:'Play: 60-second turn timer ring around the active player, a YOUR TURN banner, and reaction stickers that float up on every phone and the TV. Every suggestion stops all screens: the 3 cards fly in, then players are asked clockwise until someone has a match. Roll, move on glowing squares, enter a room to suggest. The player who can disprove picks which card to show you; the TV shows who showed whom, never the card.',sfx:'Dice rattle and land, token step clicks, door creak on entering a room, card slide when shown.',hap:'Dice: rumble while rolling, hard tap on land. Your turn: double buzz. Card shown to you: soft tap.'},
 accuse:{what:'Accusation: pick Who, Where, With what. One chance. A wrong guess turns you into a ghost: the TV announces "wrong accusation" to everyone without revealing the guess, your token turns grey, your turns are skipped, but you still show cards.',sfx:'Tension drone; gavel on confirm.',hap:'Long press feel on confirm.'},
 reveal:{what:'Reveal: envelope shakes and tears open, the 3 cards flip, then a spotlight turns the killer from silhouette to portrait.',sfx:'Drum roll, paper tear, flip ×3, spotlight thunk, crowd gasp.',hap:'One tap per card flip; heavy hit on the killer.'},
 tutorial:{what:'First game only: 7 coach marks spotlight the board, the player bar and timer, the roll button, the notes, Accuse and reactions. Players can skip it; it never shows again after that.',sfx:'Soft chime per step.',hap:'Light tap per step.'},
 end:{what:'Results: winner, the answer, what really happened, a case timeline, 4 awards (also on the TV) and a rematch vote. Play again keeps the same room.',sfx:'Firecracker celebration, gong.',hap:'Celebration pattern.'}};
window.GC={RB,SECRET,STARTS,COR,ADJ,DOORS,DR,bfs,pathTo,pct,nodeXY,diceFaces,diceRot,STORY1,MURDER,MURDER_MS,STORY2,SETUP,NOTES};
})();
