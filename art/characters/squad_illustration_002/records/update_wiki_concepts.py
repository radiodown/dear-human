from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[4]
sections = {
    'sena': '은회색 머리를 낮게 묶고 회색 눈을 가진 **외형상 25~26세의 젊은 성인**으로 구상한다. 가벼운 비대칭 정찰 망토와 경량 장갑, 슬림한 전술 바지로 저격·관측 역할을 드러낸다. 신형 근미래 정밀 사격 소총과 광학 장비를 사용하며 가터벨트·스타킹은 착용하지 않는다.\n\n말하기 전에 주위와 상대의 반응을 살피고 작은 호기심을 드러내는 성격을 제안한다. 검정·건메탈과 절제된 금장, 리안과 공유하는 시네마틱 3D 렌더 질감은 유지한다. 외형의 나이 방향과 병과별 제복은 사용자 지정이며 얼굴·머리·눈·성격·세부 장비는 **시안 002·사용자 검수 대기**다.',
    'moa': '적갈색 땋은 머리와 갈색 눈, 단단한 운동형 체격을 가진 **외형상 25~26세의 젊은 성인**으로 구상한다. 지원화기와 탄약의 하중을 받치는 하네스, 강화 어깨 장갑과 짧게 나뉜 망토, 튼튼한 전술 바지를 사용한다. 신형 근미래 지원화기와 밀폐형 탄약 모듈을 시각 기본안으로 두며 가터벨트·스타킹은 착용하지 않는다.\n\n동료의 장비와 남은 물자를 차분히 챙기는 성격을 제안한다. 공통 검정·건메탈·절제된 금장과 시네마틱 3D 렌더 질감은 유지한다. 얼굴·머리·눈·성격과 세부 장비 배치는 **시안 002·사용자 검수 대기**다.',
    'yuna': '짧은 밝은 금발 보브와 청회색 눈, 균형 잡힌 탄탄한 체형의 **외형상 25~26세 성인**으로 구상한다. 방패 하중을 받치는 전완·흉부 장갑, 짧은 망토와 닫힌 방호 바지로 진입 역할을 드러낸다. 가터벨트·스타킹은 착용하지 않는다. 방패는 각진 복합재와 절제된 금속 테두리, 작은 관측부를 갖춘 신형 근미래 장비의 시안이며 투사형 에너지 방패가 아니다.\n\n짧고 분명하게 말하면서 주변 대원의 상태를 살피는 성격을 제안한다. 공통 검정·건메탈·절제된 금장과 시네마틱 3D 렌더 질감을 유지하며 얼굴·머리·눈·성격·장비 사양은 **시안 002·사용자 검수 대기**다.',
    'iren': '다른 세 대원과 마찬가지로 **외형상 25~26세의 젊은 성인**으로 그린다. 짧은 짙은 갈색 머리와 회갈색 눈을 기본안으로 두며, 회색 노화 머리칼이나 주름·깊은 눈가 피로로 경험을 표현하지 않는다. 약 7년의 활동 경험은 안정된 자세와 절제된 태도에 담는다.\n\n분절 돌격 장갑과 짧은 어깨 망토, 짧은 장갑 하의 안의 안전 하의와 어두운 스타킹을 사용한다. **이 네 명 중 돌격 담당 이렌만 가터벨트**를 착용하며 허리에서 양쪽 스타킹 윗단으로 이어지는 세로 스트랩을 보이게 한다. 무기는 신형 근미래 돌격 소총의 시각 기본안으로 바꾼다. 얼굴·머리·눈·성격·세부 장비는 **시안 002·사용자 검수 대기**다. 친구와 전임 지휘관의 사망 이력은 유지한다.',
}
for character, section in sections.items():
    file = root / f'wiki/content/articles/{character}.md'
    raw = file.read_text(encoding='utf-8').replace('\r\n', '\n')
    match = re.fullmatch(r'---\n(.*?)\n---\n(.*)', raw, re.S)
    metadata = {}
    for line in match[1].splitlines():
        key, value = line.split(':', 1)
        metadata[key] = json.loads(value)
    fields = []
    for key, value in metadata['profile']['fields']:
        if key == '외형상 나이·각성일':
            fields.extend([['외형상 나이', '25~26세 상당'], ['각성일', '미정']])
        elif key == '외형상 나이':
            fields.append([key, '25~26세 상당'])
        else:
            fields.append([key, value])
    metadata['profile']['fields'] = fields
    if character == 'iren':
        metadata['profile']['note'] = '외형은 사용자 지정 25~26세. 각성 후 약 7년은 활동 기간 기본안이며 외형의 나이와 구분한다.'
    metadata['sources'].append('2026-11-09 사용자 수정 · 외형 25~26세·신형 화기·병과별 제복·가터벨트는 이렌만 · 일러스트 002')
    body = match[2]
    if character == 'iren':
        old = '**외형상 32세 상당, 각성 후 약 7년**을 연령 기본안으로 둔다. 이는 사용자가 지정한 연장자 방향을 구체화한 제안 수치다. 정확한 배양 시작일과 각성일, 총 복무 기간은 아직 미정이다.'
        new = '**외형상 25~26세**로 맞추며 **각성 후 약 7년**은 활동 기간 기본안으로 유지한다. 기존 외형상 32세 기본안은 사용자 후속 지시로 대체했다. 연장자라는 조건은 활동 기간과 경험에 두며, 정확한 배양 시작일과 각성일·총 복무 기간은 아직 미정이다.'
        if old not in body:
            raise ValueError('Expected age paragraph missing')
        body = body.replace(old, new)
    body, count = re.subn(r'## 콘셉트 시안 001\n.*?(?=\n## |\Z)', '## 콘셉트 시안 002\n\n' + section + '\n', body, flags=re.S)
    if count != 1:
        raise ValueError(f'Unexpected concept section count for {character}: {count}')
    if character in {'sena', 'yuna'}:
        body = body.replace('정확한 나이·생애 날짜', '실제 활동 기간·생애 날짜').replace('성격·나이·생애 날짜', '성격·실제 활동 기간·생애 날짜')
    front = '\n'.join(key + ': ' + json.dumps(value, ensure_ascii=False, separators=(',', ':')) for key, value in metadata.items())
    file.write_text('---\n' + front + '\n---\n' + body, encoding='utf-8')
    print(character, 'visual concept 002 updated')
