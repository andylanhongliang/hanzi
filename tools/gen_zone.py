import re, json

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 ALL_NODES 数组
nodes_start = content.index('var ALL_NODES = [')
nodes_end = content.index('// ==', nodes_start + 100)
nodes_section = content[nodes_start:nodes_end]

lines = nodes_section.split('\n')
current_zone = '其他'
zone_nodes = {}

for line in lines:
    m = re.match(r'\s*// ── (.+?) ──', line)
    if m:
        current_zone = m.group(1).strip()
        if current_zone not in zone_nodes:
            zone_nodes[current_zone] = []
        continue
    m = re.search(r'id:"(.+?)"', line)
    if m:
        node_id = m.group(1)
        zone_nodes[current_zone].append(node_id)

# 合并小区域到大区域
zone_groups = {
    '数字平原': ['数字序列'],
    '天地自然': ['天地自然', '天气现象'],
    '人类部落': ['人及衍生', '人体部位', '家庭成员', '身体动作'],
    '土石山水': ['土石山田', '山水自然', '金石矿物'],
    '动物森林': ['动物', '虫鱼鸟兽', '虫字族', '鱼字族', '鸟字族'],
    '植物花园': ['植物', '草木禾米', '木字族', '草字头族', '禾字族', '米字族'],
    '生活小镇': ['衣食住行', '房屋建筑', '门户井邑', '器用工具', '衣巾丝网', '饮食器皿'],
    '智慧学园': ['学习思考', '言语文教', '心情感受', '颜色形状', '方位方向', '行为动作', '抽象概念', '数量时间']
}
zone_to_group = {}
for group, sub_zones in zone_groups.items():
    for sz in sub_zones:
        zone_to_group[sz] = group

final_zones = {}
for zn_name, nids in zone_nodes.items():
    group = zone_to_group.get(zn_name, '智慧学园')
    for nid in nids:
        final_zones[nid] = group

group_counts = {}
for g in final_zones.values():
    group_counts[g] = group_counts.get(g, 0) + 1

print('区域统计:')
for g, c in sorted(group_counts.items(), key=lambda x: -x[1]):
    print(f'  {g}: {c} 字')

with open('zone_map.json', 'w', encoding='utf-8') as f:
    json.dump(final_zones, f, ensure_ascii=False)
print('\n已写入 zone_map.json')
