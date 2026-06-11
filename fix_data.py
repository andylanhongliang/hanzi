import re

with open('data.js', 'r', encoding='utf-8') as f:
    web = f.read()
with open('miniprogram/libs/data.js', 'r', encoding='utf-8') as f:
    mini = f.read()

w_start = web.find('var ALL_LINKS')
w_end = web.find('\n];', w_start)
m_start = mini.find('var ALL_LINKS')
m_end = mini.find('\n];', m_start)

w_seg = web[w_start:w_end]
m_seg = mini[m_start:m_end]

wc = re.sub(r'\s+', '', w_seg)
mc = re.sub(r'\s+', '', m_seg)

print(f'Web clean: {len(wc)} chars, {wc.count("{")} objects')
print(f'Mini clean: {len(mc)} chars, {mc.count("{")} objects')

if wc != mc:
    for i in range(min(len(wc), len(mc))):
        if wc[i] != mc[i]:
            print(f'First diff at char {i}')
            print(f'  Web : {repr(wc[max(0,i-10):i+50])}')
            print(f'  Mini: {repr(mc[max(0,i-10):i+50])}')
            break
    else:
        print(f'Mini is shorter by {len(wc)-len(mc)} chars')
        print(f'  Web  tail: {repr(wc[-100:])}')
        print(f'  Mini tail: {repr(mc[-100:])}')
else:
    print('IDENTICAL')
