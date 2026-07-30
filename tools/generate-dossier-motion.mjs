import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "assets", "dossiers");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const font = "C\\:/Windows/Fonts/consola.ttf";

const common = [
  "format=yuv420p",
  "drawgrid=width=40:height=40:thickness=1:color=0x9c73ff@0.10",
  "noise=alls=3:allf=t+u",
  "vignette=PI/5",
];

const records = [
  {
    id: "02",
    background: "0x020307",
    filters: [
      "drawbox=x=74:y=64:w=1132:h=592:color=0x05070d@0.88:t=fill",
      "drawbox=x=74:y=64:w=1132:h=592:color=0xa66cff@0.56:t=2",
      `drawtext=fontfile='${font}':text='NEMETH // INTERNAL EXTRACT':x=110:y=95:fontsize=28:fontcolor=0xf4f7ff`,
      `drawtext=fontfile='${font}':text='BALANCE':x=130+8*sin(31*t):y=218:fontsize=62:fontcolor=0x8df8df`,
      `drawtext=fontfile='${font}':text='SACRIFICE':x=390+11*sin(38*t):y=318:fontsize=72:fontcolor=0xe6e8ef`,
      `drawtext=fontfile='${font}':text='NECESSITY':x=690+9*sin(43*t):y=430:fontsize=65:fontcolor=0xff676f`,
      `drawtext=fontfile='${font}':text='CORRUPTION INDEX  82.4 PCT':x=110:y=610:fontsize=21:fontcolor=0xb6a3cc`,
      "drawbox=x=94+880*mod(t*1.7\\,1):y=175:w=210:h=7:color=0xffffff@0.45:t=fill:enable='lt(mod(t\\,0.47)\\,0.08)'",
      "drawbox=x=220:y=285+150*sin(t*9):w=770:h=4:color=0xaf6cff@0.36:t=fill:enable='lt(mod(t\\,0.63)\\,0.10)'",
    ],
  },
  {
    id: "05",
    background: "0x020504",
    filters: [
      "drawbox=x=74:y=64:w=1132:h=592:color=0x030806@0.90:t=fill",
      "drawbox=x=74:y=64:w=1132:h=592:color=0xff8a2a@0.52:t=2",
      `drawtext=fontfile='${font}':text='LUMEN // SIGNAL REMAINS':x=110:y=95:fontsize=28:fontcolor=0xffd09a`,
      `drawtext=fontfile='${font}':text='EXTERNAL SPEAKER COUNT':x=110:y=205:fontsize=30:fontcolor=0x92eee4`,
      `drawtext=fontfile='${font}':text='0':x=(w-text_w)/2:y=245:fontsize=220:fontcolor=0xff9b42`,
      `drawtext=fontfile='${font}':text='NO SOURCE OUTSIDE THE ARCHIVE':x=(w-text_w)/2:y=525:fontsize=24:fontcolor=0xc9d6cf`,
      "drawbox=x=120:y=585:w=1040:h=2:color=0x7cf5df@0.32:t=fill",
      "drawbox=x=120:y=575-26*sin(t*7):w=120+80*sin(t*4):h=5:color=0xff9b42@0.74:t=fill",
      "drawbox=x=350:y=575-36*sin(t*5+1):w=170+70*sin(t*3):h=5:color=0x7cf5df@0.68:t=fill",
      "drawbox=x=690:y=575-22*sin(t*9+2):w=210+90*sin(t*2):h=5:color=0xff9b42@0.64:t=fill",
    ],
  },
  {
    id: "09",
    background: "0x050202",
    filters: [
      "drawbox=x=74:y=64:w=1132:h=592:color=0x080405@0.90:t=fill",
      "drawbox=x=74:y=64:w=1132:h=592:color=0xff5353@0.50:t=2",
      `drawtext=fontfile='${font}':text='FINAL ASSAULT // ALIGNMENT':x=110:y=95:fontsize=28:fontcolor=0xffd8d8`,
      `drawtext=fontfile='${font}':text='YATAGARASU':x=120:y=210:fontsize=31:fontcolor=0xff745f`,
      `drawtext=fontfile='${font}':text='FLUXFIRE':x=120:y=285:fontsize=31:fontcolor=0xffae5f`,
      `drawtext=fontfile='${font}':text='NEGARA':x=120:y=360:fontsize=31:fontcolor=0xd4c7ff`,
      `drawtext=fontfile='${font}':text='KPCO':x=865:y=210:fontsize=31:fontcolor=0x9af8ed`,
      `drawtext=fontfile='${font}':text='ABERRANTS':x=790:y=285:fontsize=31:fontcolor=0xcc8dff`,
      `drawtext=fontfile='${font}':text='CHIBI-GO':x=820:y=360:fontsize=31:fontcolor=0xffd85f`,
      `drawtext=fontfile='${font}':text='SYNCHRONIZATION WINDOW':x=(w-text_w)/2:y=530:fontsize=23:fontcolor=0xd8dce4`,
      "drawbox=x=330:y=226:w=370+55*sin(t*3):h=3:color=0xff745f@0.65:t=fill",
      "drawbox=x=330:y=301:w=315+70*sin(t*4):h=3:color=0xffae5f@0.58:t=fill",
      "drawbox=x=330:y=376:w=350+45*sin(t*5):h=3:color=0xcc8dff@0.58:t=fill",
      "drawbox=x=620:y=195:w=4:h=230:color=0xffffff@0.32:t=fill",
      "drawbox=x=598:y=293:w=48:h=48:color=0xffffff@0.18:t=fill",
    ],
  },
];

mkdirSync(outputDir, { recursive: true });

for (const record of records) {
  const output = join(outputDir, `dossier-${record.id}-evidence-02.webm`);
  const filters = [...common, ...record.filters].join(",");
  const result = spawnSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${record.background}:s=1280x720:r=30:d=6`,
      "-vf",
      filters,
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-crf",
      "34",
      "-b:v",
      "0",
      "-row-mt",
      "1",
      "-pix_fmt",
      "yuv420p",
      output,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for dossier ${record.id}`);
  }
  console.log(`[OK] ${output}`);
}
