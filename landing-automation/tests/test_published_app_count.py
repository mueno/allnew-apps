"""The public list, static statistic and runtime count share one catalog."""
import copy
import json
from pathlib import Path
import re
import pytest
import render_landing_page as r

BASE = json.loads(r.DATA_PATH.read_text())['apps']


def fixtures():
    added = copy.deepcopy(BASE[0]); added.update(slug='new-public-app', asc_app_id='999999999')
    draft = copy.deepcopy(BASE); draft[0]['status']='submitted'; draft[1]['status']='draft'
    duplicate = copy.deepcopy(BASE[0]); duplicate['slug']='duplicate-store-id'
    return [(BASE,16),(BASE+[added],17),(BASE[1:],15),(draft,14),
            (BASE+[copy.deepcopy(BASE[0]),duplicate],16),([],0)]


@pytest.mark.parametrize('source,expected', fixtures())
def test_public_count_tracks_membership(source, expected):
    apps=r.normalize_released_apps(source)
    assert len(apps)==expected
    page=r.render_statistics(r.INDEX_PATH.read_text(),apps)
    assert f'id="total-app-count">{expected}</div>' in page
    assert json.loads(r.build_json_ld(apps))['numberOfItems']==expected
    for category in r.GRID_CATEGORIES:page=r.render_grid(page,category,apps)
    assert page.count('class="work-card"')==expected


def test_status_transition_and_slug_fallback():
    app=copy.deepcopy(BASE[0]);app.pop('asc_app_id',None)
    assert len(r.normalize_released_apps([app,copy.deepcopy(app)]))==1
    app['status']='submitted';assert r.normalize_released_apps([app])==[]
    app['status']='released';assert len(r.normalize_released_apps([app]))==1
    app['category']='unknown';assert r.normalize_released_apps([app])==[]


def test_statistics_missing_or_duplicate_anchor_fails_closed():
    with pytest.raises(SystemExit):r.render_statistics('',BASE)
    with pytest.raises(SystemExit):r.render_statistics(r.INDEX_PATH.read_text()*2,BASE)


def test_generated_output_is_idempotent_and_cache_versioned(monkeypatch,tmp_path):
    target=tmp_path/'index.html';target.write_text(r.INDEX_PATH.read_text())
    monkeypatch.setattr(r,'INDEX_PATH',target)
    r.main();first=target.read_bytes();r.main();assert first==target.read_bytes()
    assert re.search(rb'landing-runtime.js\?v=[a-f0-9]{16}',first)


def test_empty_source_fails_closed_without_overwriting(monkeypatch,tmp_path):
    target=tmp_path/'index.html';target.write_text(r.INDEX_PATH.read_text())
    data=tmp_path/'data.json';data.write_text('{"apps": []}')
    monkeypatch.setattr(r,'INDEX_PATH',target);monkeypatch.setattr(r,'DATA_PATH',data)
    before=target.read_bytes()
    with pytest.raises(SystemExit):r.main()
    assert target.read_bytes()==before


def test_deploy_allows_only_public_runtime():
    import subprocess
    def ignored(path):
        return subprocess.run(['git','-c','core.excludesFile='+str(r.ROOT/'.vercelignore'),
            'check-ignore','--no-index','-q',path],cwd=r.ROOT).returncode == 0
    # Vercel traverses directory names without trailing slashes.
    assert not ignored('landing-automation/runtime')
    assert not ignored('landing-automation/runtime/landing-runtime.js')
    for path in ['runtime/private.json','scripts/render_landing_page.py',
                 'config/app_catalog.json','state/landing_state.json',
                 'tests/test_published_app_count.py','tools/lp-checks/count.mjs']:
        assert ignored('landing-automation/'+path)


def candidate_fixture(tmp_path):
    import hashlib
    blobs={'data.json':json.dumps({'apps':BASE}).encode(),
           'index.html':r.render_page(r.INDEX_PATH.read_text(),BASE).encode(),
           'lookup.json':b'{}'}
    for name,blob in blobs.items():(tmp_path/name).write_bytes(blob)
    record={'source':'a'*40,'render_contract':r.render_contract(),'published':False,
            'status':'candidate_ready','sha256':{name:hashlib.sha256(blob).hexdigest() for name,blob in blobs.items()}}
    (tmp_path/'candidate.json').write_text(json.dumps(record))
    return record


def test_current_candidate_verified_without_publication_authority(tmp_path):
    candidate_fixture(tmp_path)
    result=r.verify_candidate(tmp_path,'a'*40)
    assert result['verified'] and not result['publication_authorized']


@pytest.mark.parametrize('mutation',['legacy','version','renderer','runtime','source','bytes','old-stat','forged-template'])
def test_stale_or_modified_candidate_rejected(tmp_path,mutation):
    import hashlib
    record=candidate_fixture(tmp_path)
    if mutation=='legacy':record.pop('render_contract')
    if mutation=='version':record['render_contract']['version']='v1'
    if mutation=='renderer':record['render_contract']['renderer_sha256']='0'*64
    if mutation=='runtime':record['render_contract']['runtime_sha256']='0'*64
    if mutation=='source':record['source']='b'*40
    if mutation=='bytes':(tmp_path/'data.json').write_text('{}')
    if mutation in ('old-stat','forged-template'):
        p=tmp_path/'index.html';text=p.read_text()
        text=text.replace('id="total-app-count">16','id="total-app-count">13') if mutation=='old-stat' else text.replace('<title>AllNew Apps</title>','<title>Other site</title>')
        p.write_text(text);record['sha256']['index.html']=hashlib.sha256(p.read_bytes()).hexdigest()
    (tmp_path/'candidate.json').write_text(json.dumps(record))
    with pytest.raises(SystemExit):r.verify_candidate(tmp_path,'a'*40)


def test_full_renderer_repairs_old_statistics():
    page=r.INDEX_PATH.read_text().replace('id="total-app-count">16','id="total-app-count">13')
    assert 'id="total-app-count">16' in r.render_page(page,BASE)


def test_supervised_public_verifier_rejects_stale_statistic(monkeypatch):
    import verify_supervised_recovery as recovery
    import local_release_publisher as local
    catalog=json.loads((r.ROOT/'landing-automation/config/app_catalog.json').read_text())
    lookup={country:{str(a['asc_app_id']):{'artistId':catalog['artist_id'],'bundleId':a['bundle_id']} for a in BASE} for country in ('jp','us')}
    monkeypatch.setattr(recovery.update,'build_entry_from_app_store',lambda app,*args:app)
    monkeypatch.setattr(recovery.content,'refresh_machine_owned_entry',lambda *args:False)
    monkeypatch.setattr(recovery.parity,'evaluate_parity',lambda *args:{'missing':[]})
    page=r.INDEX_PATH.read_text().replace('id="total-app-count">16','id="total-app-count">13')
    with pytest.raises(local.Rejected,match='Rendered HTML'):
        recovery.verify_public(catalog,{'apps':BASE},lookup,page)
