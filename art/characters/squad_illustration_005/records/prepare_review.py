from pathlib import Path
import re

root=Path(__file__).resolve().parents[4]
source=root/'art/characters/squad_illustration_003/records/review.py'
target=Path(__file__).parent/'review.py'
assert not target.exists()
code=source.read_text(encoding='utf-8').replace('003','005')
code=re.sub(r'^names=.*$',"names=('yuna','iren')",code,count=1,flags=re.M)
code=code.replace('four new','two new').replace('four characters','two characters')
target.write_text(code,encoding='utf-8')
