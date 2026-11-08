# Requires Python 3, numpy, Node.js, curl, and ffmpeg. See sound/CREDITS.md.
import json,re,subprocess,pathlib,concurrent.futures,numpy as np
root=pathlib.Path(__file__).resolve().parents[1]; tmp=pathlib.Path('/tmp/recorded-instruments');tmp.mkdir(exist_ok=True)
revision='622c2f1c32c8cfce4158ddc3eb26e518ddef37e5'
base=f'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/{revision}'
def fetch(url,path):
 if not path.exists(): subprocess.run(['curl','-fL','--retry','2','--max-time','40','-sS',url,'-o',str(path)],check=True)
fetch(base+'/Tonejs-Instruments.js',tmp/'catalog.js');catalog=(tmp/'catalog.js').read_text()
targets=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {SAMPLE_NOTES} from './js/sound-samples.js'; console.log(JSON.stringify(SAMPLE_NOTES))"],cwd=root))
sources={'guitar':'guitar-acoustic','trumpet':'trumpet','trombone':'trombone','tenor-sax':'saxophone','alto-sax':'saxophone'}
def midi(n):
 m=re.fullmatch(r'([A-G])([#s]?)(\d)',n);return 12*(int(m[3])+1)+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[m[1]]+bool(m[2])
jobs=[]
for kind,source in sources.items():
 body=re.search("'"+source+"': \\{(.*?)\\n    \\}",catalog,re.S)[1]
 notes=[(midi(a),b) for a,b in re.findall(r"'([^']+)': '([^']+)\.\[mp3\|ogg\]'",body)]
 for note in targets[kind]:
  sourceMidi,name=min(notes,key=lambda n:abs(n[0]-note['midi']))
  jobs.append((kind,note,source,sourceMidi,name))
files={(source,name) for _,_,source,_,name in jobs}
def download(job):
 source,name=job;fetch(f'{base}/samples/{source}/{name}.mp3',tmp/f'{source}-{name}.mp3')
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(download,files))
report=[]
for kind,note,source,sourceMidi,name in jobs:
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(tmp/f'{source}-{name}.mp3'),'-ac','1','-ar','44100','-f','f32le','-'])
 pcm=np.frombuffer(raw,dtype='<f4'); peak=np.max(np.abs(pcm));active=np.flatnonzero(np.abs(pcm)>peak*.008)
 start=max(0,int(active[0])-220);pcm=pcm[start:];rate=2**((note['midi']-sourceMidi)/12)
 # Preserve breath and pick transients; retain up to 3 seconds of the performance.
 dest=root/'sound/samples'/kind/(note['name']+'.m4a')
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar','44100','-ac','1','-i','-','-af',f'asetrate={44100*rate},aresample=44100,atrim=duration=3,afade=t=in:d=0.002,afade=t=out:st=2.95:d=0.05','-c:a','aac','-b:a','96k',str(dest)],input=pcm.astype('<f4').tobytes(),check=True)
 decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(dest),'-ac','1','-ar','22050','-f','f32le','-']); wave=np.frombuffer(decoded,dtype='<f4');rms=float(np.sqrt(np.mean(wave[:5512]**2)))
 (tmp/f'{kind}-{note["name"]}.f32').write_bytes(decoded)
 report.append({'kind':kind,'name':note['name'],'midi':note['midi'],'source':f'{source}/{name}.mp3','sourceMidi':sourceMidi,'trimSeconds':start/44100,'rms':round(rms,6)})
(tmp/'report.json').write_text(json.dumps(report,indent=2));print('Converted',len(report),'recordings')
