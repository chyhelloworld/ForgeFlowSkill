"""Actual local Chrome operations for the bounded manual journey; no mocked browser."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'iterations/0.9'/ (sys.argv[1] if len(sys.argv)>1 else 'ui-evidence')
assert OUT.parent == ROOT/'iterations/0.9' and not OUT.exists(), 'Use a fresh direct evidence directory'
OUT.mkdir()
temporary=ROOT.parent/'_handoff/20261017/browser09-tmp';temporary.mkdir(parents=True,exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(temporary)
HTML=ROOT/'docs/FF-离线图文手册.html'
TARGET='manual-09'
LABEL='0.9 完整旅程与交互证据'
EXPECTED=[
 {'id':'open','from':'start','to':'contents','action':'open'},
 {'id':'filter','from':'contents','to':'filtered','action':'filter'},
 {'id':'navigate','from':'filtered','to':'rules','action':'navigate'},
 {'id':'empty','from':'rules','to':'empty-filter','action':'filter-empty'},
 {'id':'restore','from':'empty-filter','to':'rules','action':'clear'},
 {'id':'narrow-open','from':'rules','to':'narrow-contents','action':'resize-open'},
 {'id':'narrow-filter','from':'narrow-contents','to':'narrow-filtered','action':'filter'},
 {'id':'narrow-navigate','from':'narrow-filtered','to':'narrow-rules','action':'navigate'},
]


def evidence(path):
    return {'path':path.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


def write_json(path,data):
    path.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))


def settle(page):
    previous=None;stable=0
    for _ in range(30):
        position=page.evaluate('Math.round(scrollY)')
        stable=stable+1 if position==previous else 0
        if stable>=3:return position
        previous=position;page.wait_for_timeout(100)
    raise AssertionError('scroll did not settle')


design=[evidence(ROOT/'iterations/0.9/DESIGN.md')]
sources=[evidence(HTML),evidence(Path(__file__).resolve()),evidence(ROOT/'skills/ff-design/scripts/journey.py')]
fingerprint=hashlib.sha256(json.dumps([design,sources],sort_keys=True,separators=(',',':'),ensure_ascii=True).encode('utf-8')).hexdigest()
write_json(OUT/'before.json',{'capturedUtcEpoch':time.time(),'design':design,'sources':sources,'inputFingerprint':fingerprint})
record={'version':1,'target':TARGET,'surface':'ui','design':design,'sources':sources,'expected':EXPECTED,'observations':[]}
events=[]


def capture(page,step_id,observed):
    step=next(s for s in EXPECTED if s['id']==step_id)
    png=OUT/(step_id+'.png');page.screenshot(path=str(png))
    screenshots=[evidence(png)]
    trace={**{k:step[k] for k in ('from','to','action')},'stepId':step_id,'target':TARGET,
           'inputFingerprint':fingerprint,'screenshots':screenshots,'ok':True,'observed':observed,'observedUtcEpoch':time.time(),
           'viewport':page.viewport_size,'url':page.url}
    trace_path=OUT/(step_id+'.json');write_json(trace_path,trace)
    record['observations'].append({**step,'trace':evidence(trace_path),'screenshots':screenshots})
    events.append({'step':step_id,'at':trace['observedUtcEpoch'],'actualActionCompleted':True})
    write_json(OUT/'journey.json',record);write_json(OUT/'events.json',events)


try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
        page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(HTML.as_uri());page.wait_for_load_state('networkidle')
        total=page.locator('nav a').count();assert total>0
        capture(page,'open',{'directoryCount':total,'mainTitle':page.locator('h1').inner_text()})
        page.locator('#search').fill('旅程');count=page.locator('nav a:visible').count();assert 0<count<total
        link=page.get_by_role('link',name=LABEL,exact=True);expect(link).to_be_visible()
        capture(page,'filter',{'query':page.locator('#search').input_value(),'visibleDirectoryCount':count,'targetVisible':link.is_visible()})
        href=link.get_attribute('href');link.click();expect(page).to_have_url(HTML.as_uri()+href);position=settle(page)
        box=page.locator(href).bounding_box();assert box and box['y']>=0 and box['y']+box['height']<=1000
        content=page.locator('main').inner_text();anchor=page.url
        capture(page,'navigate',{'targetHeading':page.locator(href).inner_text(),'headingBox':box,'settledScrollY':position,'ruleContainsObserved':'OBSERVED' in content})
        page.locator('#search').fill('NO_MATCH_FF09');count=page.locator('nav a:visible').count();assert count==0 and page.url==anchor and page.locator('main').inner_text()==content
        capture(page,'empty',{'visibleDirectoryCount':count,'anchorPreserved':page.url==anchor,'mainUnchanged':page.locator('main').inner_text()==content})
        page.locator('#search').fill('');count=page.locator('nav a:visible').count();assert count==total and page.url==anchor
        capture(page,'restore',{'visibleDirectoryCount':count,'anchorPreserved':page.url==anchor})
        page.set_viewport_size({'width':390,'height':844});page.goto(HTML.as_uri());page.wait_for_load_state('networkidle')
        overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not overflow
        capture(page,'narrow-open',{'directoryCount':page.locator('nav a').count(),'horizontalOverflow':overflow})
        page.locator('#search').fill('旅程');count=page.locator('nav a:visible').count();assert 0<count<total
        link=page.get_by_role('link',name=LABEL,exact=True);expect(link).to_be_visible()
        capture(page,'narrow-filter',{'visibleDirectoryCount':count,'targetVisible':link.is_visible()})
        link.click();expect(page).to_have_url(HTML.as_uri()+href);position=settle(page)
        box=page.locator(href).bounding_box();assert box and box['y']>=0 and box['y']+box['height']<=844
        overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not overflow and not errors
        capture(page,'narrow-navigate',{'targetHeading':page.locator(href).inner_text(),'headingBox':box,'settledScrollY':position,'horizontalOverflow':overflow,'pageErrors':errors})
        write_json(OUT/'browser.json',{'version':browser.version,'executable':'C:/Program Files/Google/Chrome/Application/chrome.exe','pageErrors':errors,'limits':'Headless Windows Chrome with viewport emulation, not real phone/touch/assistive technology or human acceptance'})
        browser.close()
    result=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'skills/ff-design/scripts/journey.py'),str(OUT/'journey.json'),'--root',str(ROOT),'--current-target',TARGET],capture_output=True)
    (OUT/'checker.stdout.json').write_bytes(result.stdout);(OUT/'checker.stderr.txt').write_bytes(result.stderr)
    write_json(OUT/'result.json',{'actualSteps':len(events),'exitCode':result.returncode,'sourceBytesUnchanged':sources==[evidence(HTML),evidence(Path(__file__).resolve()),evidence(ROOT/'skills/ff-design/scripts/journey.py')],'limits':'Selected document journey, not a general business/visual acceptance result'})
    print(result.stdout.decode('utf-8'));raise SystemExit(result.returncode)
except Exception as error:
    write_json(OUT/'failure.json',{'type':type(error).__name__,'error':str(error),'completedSteps':events,'at':time.time()})
    raise
