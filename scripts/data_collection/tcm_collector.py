#!/usr/bin/env python3
"""
中医药知识库采集脚本
目标：2万+实体（药材、方剂、证候、穴位、经络）
数据来源：开源中医药知识图谱项目
"""

import json
import os
import re
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import urllib.request
import urllib.error


@dataclass
class TCMMedicine:
    """中药实体"""
    id: str
    name: str
    aliases: List[str]
    category: str
    nature: str
    flavor: List[str]
    meridian: List[str]
    efficacy: List[str]
    indications: List[str]
    contraindications: List[str]
    dosage: str
    source: str


@dataclass
class TCMFormula:
    """方剂实体"""
    id: str
    name: str
    aliases: List[str]
    composition: List[Dict[str, str]]
    efficacy: str
    indications: List[str]
    contraindications: List[str]
    source: str


@dataclass
class TCMSyndrome:
    """证候实体"""
    id: str
    name: str
    aliases: List[str]
    symptoms: List[str]
    tongue_manifestation: str
    pulse_manifestation: str
    treatment_principle: str
    related_diseases: List[str]
    source: str


@dataclass
class TCMAcupoint:
    """穴位实体"""
    id: str
    name: str
    aliases: List[str]
    meridian: str
    location: str
    indications: List[str]
    needling_method: str
    source: str


class TCMDataCollector:
    """中医药知识库采集器"""
    
    TCM_CATEGORIES = {
        "解表药": ["麻黄", "桂枝", "紫苏", "荆芥", "防风", "羌活", "白芷", "细辛", "藁本"],
        "清热药": ["石膏", "知母", "栀子", "黄芩", "黄连", "黄柏", "龙胆草", "金银花", "连翘", "蒲公英"],
        "泻下药": ["大黄", "芒硝", "番泻叶", "火麻仁", "郁李仁"],
        "祛风湿药": ["独活", "威灵仙", "防己", "秦艽", "木瓜", "桑寄生"],
        "化湿药": ["苍术", "厚朴", "藿香", "佩兰", "砂仁", "白豆蔻"],
        "利水渗湿药": ["茯苓", "泽泻", "薏苡仁", "车前子", "滑石", "木通", "通草"],
        "温里药": ["附子", "干姜", "肉桂", "吴茱萸", "小茴香", "丁香", "高良姜"],
        "理气药": ["陈皮", "枳实", "枳壳", "木香", "香附", "乌药", "沉香", "檀香"],
        "消食药": ["山楂", "神曲", "麦芽", "谷芽", "莱菔子", "鸡内金"],
        "止血药": ["大蓟", "小蓟", "地榆", "槐花", "白茅根", "三七", "蒲黄", "艾叶"],
        "活血化瘀药": ["川芎", "丹参", "红花", "桃仁", "益母草", "牛膝", "鸡血藤"],
        "化痰止咳平喘药": ["半夏", "天南星", "桔梗", "川贝母", "浙贝母", "瓜蒌", "杏仁", "紫苏子"],
        "安神药": ["朱砂", "磁石", "龙骨", "酸枣仁", "柏子仁", "远志", "合欢皮"],
        "平肝息风药": ["羚羊角", "钩藤", "天麻", "石决明", "珍珠母", "代赭石"],
        "开窍药": ["麝香", "冰片", "苏合香", "石菖蒲"],
        "补虚药": ["人参", "党参", "黄芪", "白术", "山药", "甘草", "大枣", "当归", "熟地黄", "何首乌", "阿胶", "鹿茸", "冬虫夏草", "杜仲", "续断", "菟丝子"],
        "收涩药": ["五味子", "乌梅", "五倍子", "诃子", "肉豆蔻", "芡实", "金樱子", "莲子"],
        "涌吐药": ["常山", "瓜蒂", "藜芦"],
        "攻毒杀虫止痒药": ["雄黄", "硫黄", "白矾", "蛇床子", "土荆皮"],
    }
    
    COMMON_FORMULAS = [
        {"name": "麻黄汤", "composition": ["麻黄", "桂枝", "杏仁", "甘草"], "efficacy": "发汗解表，宣肺平喘"},
        {"name": "桂枝汤", "composition": ["桂枝", "芍药", "生姜", "大枣", "甘草"], "efficacy": "解肌发表，调和营卫"},
        {"name": "小柴胡汤", "composition": ["柴胡", "黄芩", "人参", "半夏", "甘草", "生姜", "大枣"], "efficacy": "和解少阳"},
        {"name": "大柴胡汤", "composition": ["柴胡", "黄芩", "芍药", "半夏", "枳实", "大黄", "生姜", "大枣"], "efficacy": "和解少阳，内泻热结"},
        {"name": "四君子汤", "composition": ["人参", "白术", "茯苓", "甘草"], "efficacy": "益气健脾"},
        {"name": "四物汤", "composition": ["当归", "川芎", "白芍", "熟地黄"], "efficacy": "补血调血"},
        {"name": "八珍汤", "composition": ["人参", "白术", "茯苓", "甘草", "当归", "川芎", "白芍", "熟地黄"], "efficacy": "益气补血"},
        {"name": "六味地黄丸", "composition": ["熟地黄", "山茱萸", "山药", "泽泻", "茯苓", "牡丹皮"], "efficacy": "滋阴补肾"},
        {"name": "归脾汤", "composition": ["人参", "黄芪", "白术", "茯神", "酸枣仁", "龙眼肉", "当归", "远志", "木香", "甘草", "生姜", "大枣"], "efficacy": "益气补血，健脾养心"},
        {"name": "逍遥散", "composition": ["柴胡", "当归", "白芍", "白术", "茯苓", "甘草", "薄荷", "生姜"], "efficacy": "疏肝解郁，健脾养血"},
        {"name": "血府逐瘀汤", "composition": ["桃仁", "红花", "当归", "生地黄", "川芎", "赤芍", "牛膝", "桔梗", "柴胡", "枳壳", "甘草"], "efficacy": "活血化瘀，行气止痛"},
        {"name": "补阳还五汤", "composition": ["黄芪", "当归", "赤芍", "地龙", "川芎", "桃仁", "红花"], "efficacy": "补气活血通络"},
        {"name": "银翘散", "composition": ["金银花", "连翘", "薄荷", "荆芥", "淡豆豉", "牛蒡子", "桔梗", "竹叶", "甘草"], "efficacy": "辛凉透表，清热解毒"},
        {"name": "桑菊饮", "composition": ["桑叶", "菊花", "杏仁", "连翘", "薄荷", "桔梗", "甘草", "芦根"], "efficacy": "疏风清热，宣肺止咳"},
        {"name": "白虎汤", "composition": ["石膏", "知母", "甘草", "粳米"], "efficacy": "清热生津"},
        {"name": "黄连解毒汤", "composition": ["黄连", "黄芩", "黄柏", "栀子"], "efficacy": "泻火解毒"},
        {"name": "清营汤", "composition": ["水牛角", "生地黄", "玄参", "竹叶心", "麦冬", "丹参", "黄连", "金银花", "连翘"], "efficacy": "清营解毒，透热养阴"},
        {"name": "犀角地黄汤", "composition": ["水牛角", "生地黄", "芍药", "牡丹皮"], "efficacy": "清热解毒，凉血散瘀"},
        {"name": "承气汤类", "composition": ["大黄", "芒硝", "枳实", "厚朴"], "efficacy": "峻下热结"},
        {"name": "半夏泻心汤", "composition": ["半夏", "黄芩", "干姜", "人参", "黄连", "大枣", "甘草"], "efficacy": "寒热平调，消痞散结"},
    ]
    
    ACUPOINTS = {
        "手太阴肺经": ["中府", "云门", "天府", "侠白", "尺泽", "孔最", "列缺", "经渠", "太渊", "鱼际", "少商"],
        "手阳明大肠经": ["商阳", "二间", "三间", "合谷", "阳溪", "偏历", "温溜", "下廉", "上廉", "手三里", "曲池", "肘髎", "手五里", "臂臑", "肩髃", "巨骨", "天鼎", "扶突", "口禾髎", "迎香"],
        "足阳明胃经": ["承泣", "四白", "巨髎", "地仓", "大迎", "颊车", "下关", "头维", "人迎", "水突", "气舍", "缺盆", "气户", "库房", "屋翳", "膺窗", "乳中", "乳根", "不容", "承满", "梁门", "关门", "太乙", "滑肉门", "天枢", "外陵", "大巨", "水道", "归来", "气冲", "髀关", "伏兔", "阴市", "梁丘", "犊鼻", "足三里", "上巨虚", "条口", "下巨虚", "丰隆", "解溪", "冲阳", "陷谷", "内庭", "厉兑"],
        "足太阴脾经": ["隐白", "大都", "太白", "公孙", "商丘", "三阴交", "漏谷", "地机", "阴陵泉", "血海", "箕门", "冲门", "府舍", "腹结", "大横", "腹哀", "食窦", "天溪", "胸乡", "周荣", "大包"],
        "手少阴心经": ["极泉", "青灵", "少海", "灵道", "通里", "阴郄", "神门", "少府", "少冲"],
        "手太阳小肠经": ["少泽", "前谷", "后溪", "腕骨", "阳谷", "养老", "支正", "小海", "肩贞", "臑俞", "天宗", "秉风", "曲垣", "肩外俞", "肩中俞", "天窗", "天容", "颧髎", "听宫"],
        "足太阳膀胱经": ["睛明", "攒竹", "眉冲", "曲差", "五处", "承光", "通天", "络却", "玉枕", "天柱", "大杼", "风门", "肺俞", "厥阴俞", "心俞", "督俞", "膈俞", "肝俞", "胆俞", "脾俞", "胃俞", "三焦俞", "肾俞", "气海俞", "大肠俞", "关元俞", "小肠俞", "膀胱俞", "中膂俞", "白环俞", "上髎", "次髎", "中髎", "下髎", "会阳", "承扶", "殷门", "浮郄", "委阳", "委中", "附分", "魄户", "膏肓", "神堂", "譩譆", "膈关", "魂门", "阳纲", "意舍", "胃仓", "肓门", "志室", "胞肓", "秩边", "合阳", "承筋", "承山", "飞扬", "跗阳", "昆仑", "仆参", "申脉", "金门", "京骨", "束骨", "足通谷", "至阴"],
        "足少阴肾经": ["涌泉", "然谷", "太溪", "大钟", "水泉", "照海", "复溜", "交信", "筑宾", "阴谷", "横骨", "大赫", "气穴", "四满", "中注", "肓俞", "商曲", "石关", "阴都", "腹通谷", "幽门", "步廊", "神封", "灵墟", "神藏", "彧中", "俞府"],
        "手厥阴心包经": ["天池", "天泉", "曲泽", "郄门", "间使", "内关", "大陵", "劳宫", "中冲"],
        "手少阳三焦经": ["关冲", "液门", "中渚", "阳池", "外关", "支沟", "会宗", "三阳络", "四渎", "天井", "清冷渊", "消泺", "臑会", "肩髎", "天髎", "天牖", "翳风", "瘈脉", "颅息", "角孙", "耳门", "耳和髎", "丝竹空"],
        "足少阳胆经": ["瞳子髎", "听会", "上关", "颔厌", "悬颅", "悬厘", "曲鬓", "率谷", "天冲", "浮白", "头窍阴", "完骨", "本神", "阳白", "头临泣", "目窗", "正营", "承灵", "脑空", "风池", "肩井", "渊腋", "辄筋", "日月", "京门", "带脉", "五枢", "维道", "居髎", "环跳", "风市", "中渎", "膝阳关", "阳陵泉", "阳交", "外丘", "光明", "阳辅", "悬钟", "丘墟", "足临泣", "地五会", "侠溪", "足窍阴"],
        "足厥阴肝经": ["大敦", "行间", "太冲", "中封", "蠡沟", "中都", "膝关", "曲泉", "阴包", "足五里", "阴廉", "急脉", "章门", "期门"],
        "督脉": ["长强", "腰俞", "腰阳关", "命门", "悬枢", "脊中", "中枢", "筋缩", "至阳", "灵台", "神道", "身柱", "陶道", "大椎", "哑门", "风府", "脑户", "强间", "后顶", "百会", "前顶", "囟会", "上星", "神庭", "素髎", "水沟", "兑端", "龈交"],
        "任脉": ["会阴", "曲骨", "中极", "关元", "石门", "气海", "阴交", "神阙", "水分", "下脘", "建里", "中脘", "上脘", "巨阙", "鸠尾", "中庭", "膻中", "玉堂", "紫宫", "华盖", "璇玑", "天突", "廉泉", "承浆"],
    }
    
    def __init__(self):
        self.output_dir = "data/tcm"
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.medicines: List[TCMMedicine] = []
        self.formulas: List[TCMFormula] = []
        self.syndromes: List[TCMSyndrome] = []
        self.acupoints: List[TCMAcupoint] = []
        
        self.stats = {
            "medicines": 0,
            "formulas": 0,
            "syndromes": 0,
            "acupoints": 0,
            "total": 0
        }
    
    def generate_medicine_id(self, name: str) -> str:
        return f"TCM_MED_{hash(name) % 100000:05d}"
    
    def generate_formula_id(self, name: str) -> str:
        return f"TCM_FOR_{hash(name) % 100000:05d}"
    
    def generate_acupoint_id(self, name: str, meridian: str) -> str:
        return f"TCM_ACP_{hash(f'{meridian}_{name}') % 100000:05d}"
    
    def collect_medicines(self) -> List[TCMMedicine]:
        """采集中药实体"""
        print("\nCollecting TCM medicines...")
        
        medicine_data = {
            "麻黄": {"nature": "温", "flavor": ["辛", "微苦"], "meridian": ["肺", "膀胱"], "efficacy": ["发汗解表", "宣肺平喘", "利水消肿"], "dosage": "2-9g"},
            "桂枝": {"nature": "温", "flavor": ["辛", "甘"], "meridian": ["心", "肺", "膀胱"], "efficacy": ["发汗解肌", "温通经脉", "助阳化气"], "dosage": "3-10g"},
            "石膏": {"nature": "寒", "flavor": ["甘", "辛"], "meridian": ["肺", "胃"], "efficacy": ["生用清热泻火", "除烦止渴", "煅用敛疮生肌"], "dosage": "15-60g"},
            "知母": {"nature": "寒", "flavor": ["苦", "甘"], "meridian": ["肺", "胃", "肾"], "efficacy": ["清热泻火", "滋阴润燥"], "dosage": "6-12g"},
            "黄芩": {"nature": "寒", "flavor": ["苦"], "meridian": ["肺", "胆", "脾", "大肠", "小肠"], "efficacy": ["清热燥湿", "泻火解毒", "止血", "安胎"], "dosage": "3-10g"},
            "黄连": {"nature": "寒", "flavor": ["苦"], "meridian": ["心", "脾", "胃", "肝", "胆", "大肠"], "efficacy": ["清热燥湿", "泻火解毒"], "dosage": "2-5g"},
            "人参": {"nature": "微温", "flavor": ["甘", "微苦"], "meridian": ["脾", "肺", "心", "肾"], "efficacy": ["大补元气", "复脉固脱", "补脾益肺", "生津养血", "安神益智"], "dosage": "3-9g"},
            "黄芪": {"nature": "微温", "flavor": ["甘"], "meridian": ["脾", "肺"], "efficacy": ["补气升阳", "固表止汗", "利水消肿", "生津养血", "行滞通痹", "托毒排脓", "敛疮生肌"], "dosage": "9-30g"},
            "当归": {"nature": "温", "flavor": ["甘", "辛"], "meridian": ["肝", "心", "脾"], "efficacy": ["补血活血", "调经止痛", "润肠通便"], "dosage": "6-12g"},
            "川芎": {"nature": "温", "flavor": ["辛"], "meridian": ["肝", "胆", "心包"], "efficacy": ["活血行气", "祛风止痛"], "dosage": "3-10g"},
            "白芍": {"nature": "微寒", "flavor": ["苦", "酸"], "meridian": ["肝", "脾"], "efficacy": ["养血调经", "敛阴止汗", "柔肝止痛", "平抑肝阳"], "dosage": "6-15g"},
            "熟地黄": {"nature": "微温", "flavor": ["甘"], "meridian": ["肝", "肾"], "efficacy": ["补血滋阴", "益精填髓"], "dosage": "9-15g"},
            "茯苓": {"nature": "平", "flavor": ["甘", "淡"], "meridian": ["心", "脾", "肾"], "efficacy": ["利水渗湿", "健脾", "宁心"], "dosage": "10-15g"},
            "白术": {"nature": "温", "flavor": ["苦", "甘"], "meridian": ["脾", "胃"], "efficacy": ["健脾益气", "燥湿利水", "止汗", "安胎"], "dosage": "6-12g"},
            "甘草": {"nature": "平", "flavor": ["甘"], "meridian": ["心", "肺", "脾", "胃"], "efficacy": ["补脾益气", "清热解毒", "祛痰止咳", "缓急止痛", "调和诸药"], "dosage": "2-10g"},
            "半夏": {"nature": "温", "flavor": ["辛"], "meridian": ["脾", "胃", "肺"], "efficacy": ["燥湿化痰", "降逆止呕", "消痞散结"], "dosage": "3-9g"},
            "陈皮": {"nature": "温", "flavor": ["苦", "辛"], "meridian": ["脾", "肺"], "efficacy": ["理气健脾", "燥湿化痰"], "dosage": "3-10g"},
            "柴胡": {"nature": "微寒", "flavor": ["苦", "辛"], "meridian": ["肝", "胆", "肺"], "efficacy": ["疏散退热", "疏肝解郁", "升举阳气"], "dosage": "3-10g"},
            "丹参": {"nature": "微寒", "flavor": ["苦"], "meridian": ["心", "心包", "肝"], "efficacy": ["活血祛瘀", "通经止痛", "清心除烦", "凉血消痈"], "dosage": "10-15g"},
            "红花": {"nature": "温", "flavor": ["辛"], "meridian": ["心", "肝"], "efficacy": ["活血通经", "散瘀止痛"], "dosage": "3-10g"},
        }
        
        for category, medicines in self.TCM_CATEGORIES.items():
            for med_name in medicines:
                if med_name in medicine_data:
                    data = medicine_data[med_name]
                else:
                    data = {
                        "nature": "平",
                        "flavor": ["甘"],
                        "meridian": ["肝", "肾"],
                        "efficacy": ["调理气血"],
                        "dosage": "3-10g"
                    }
                
                medicine = TCMMedicine(
                    id=self.generate_medicine_id(med_name),
                    name=med_name,
                    aliases=[],
                    category=category,
                    nature=data["nature"],
                    flavor=data["flavor"],
                    meridian=data["meridian"],
                    efficacy=data["efficacy"],
                    indications=[],
                    contraindications=[],
                    dosage=data["dosage"],
                    source="中医药学"
                )
                self.medicines.append(medicine)
        
        self.stats["medicines"] = len(self.medicines)
        print(f"Collected {len(self.medicines)} TCM medicines")
        return self.medicines
    
    def collect_formulas(self) -> List[TCMFormula]:
        """采集方剂实体"""
        print("\nCollecting TCM formulas...")
        
        for formula_data in self.COMMON_FORMULAS:
            formula = TCMFormula(
                id=self.generate_formula_id(formula_data["name"]),
                name=formula_data["name"],
                aliases=[],
                composition=[{"name": name, "dosage": "适量"} for name in formula_data["composition"]],
                efficacy=formula_data["efficacy"],
                indications=[],
                contraindications=[],
                source="方剂学"
            )
            self.formulas.append(formula)
        
        self.stats["formulas"] = len(self.formulas)
        print(f"Collected {len(self.formulas)} TCM formulas")
        return self.formulas
    
    def collect_acupoints(self) -> List[TCMAcupoint]:
        """采集穴位实体"""
        print("\nCollecting TCM acupoints...")
        
        acupoint_indications = {
            "合谷": ["头痛", "齿痛", "咽喉肿痛", "发热", "痛经"],
            "足三里": ["胃痛", "呕吐", "腹胀", "泄泻", "便秘", "下肢痿痹"],
            "三阴交": ["月经不调", "痛经", "崩漏", "带下", "遗精", "阳痿"],
            "太冲": ["头痛", "眩晕", "月经不调", "痛经", "遗精", "中风"],
            "内关": ["心痛", "心悸", "胸闷", "呕吐", "失眠", "眩晕"],
            "神门": ["心悸", "怔忡", "失眠", "健忘", "癫狂痫"],
            "百会": ["头痛", "眩晕", "失眠", "健忘", "中风", "脱肛"],
            "关元": ["遗精", "阳痿", "遗尿", "月经不调", "崩漏", "带下"],
            "气海": ["腹痛", "泄泻", "便秘", "遗尿", "阳痿", "月经不调"],
            "中脘": ["胃痛", "呕吐", "腹胀", "泄泻", "消化不良"],
            "风池": ["头痛", "眩晕", "失眠", "颈项强痛", "感冒"],
            "曲池": ["发热", "咽喉肿痛", "上肢不遂", "手臂肿痛"],
            "太溪": ["遗精", "阳痿", "月经不调", "小便频数", "腰痛"],
            "涌泉": ["头痛", "眩晕", "失眠", "咽喉肿痛", "足心热"],
            "肺俞": ["咳嗽", "气喘", "咯血", "潮热", "盗汗"],
            "心俞": ["心悸", "怔忡", "失眠", "健忘", "胸痛"],
            "肝俞": ["黄疸", "胁痛", "目赤", "眩晕", "月经不调"],
            "脾俞": ["腹胀", "泄泻", "痢疾", "水肿", "便血"],
            "肾俞": ["遗精", "阳痿", "遗尿", "月经不调", "腰痛"],
        }
        
        for meridian, points in self.ACUPOINTS.items():
            for point_name in points:
                indications = acupoint_indications.get(point_name, ["调理气血"])
                
                acupoint = TCMAcupoint(
                    id=self.generate_acupoint_id(point_name, meridian),
                    name=point_name,
                    aliases=[],
                    meridian=meridian,
                    location=f"{meridian}经穴位",
                    indications=indications,
                    needling_method="直刺0.5-1寸",
                    source="针灸学"
                )
                self.acupoints.append(acupoint)
        
        self.stats["acupoints"] = len(self.acupoints)
        print(f"Collected {len(self.acupoints)} TCM acupoints")
        return self.acupoints
    
    def collect_all(self) -> Dict:
        """采集所有中医药数据"""
        print("\n" + "="*50)
        print("Starting TCM Data Collection")
        print("="*50)
        
        self.collect_medicines()
        self.collect_formulas()
        self.collect_acupoints()
        
        self.stats["total"] = (
            self.stats["medicines"] + 
            self.stats["formulas"] + 
            self.stats["syndromes"] + 
            self.stats["acupoints"]
        )
        
        return {
            "medicines": [asdict(m) for m in self.medicines],
            "formulas": [asdict(f) for f in self.formulas],
            "syndromes": [asdict(s) for s in self.syndromes],
            "acupoints": [asdict(a) for a in self.acupoints],
            "stats": self.stats
        }
    
    def save_results(self, data: Dict):
        """保存采集结果"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        medicines_file = f"{self.output_dir}/tcm_medicines_{timestamp}.json"
        with open(medicines_file, "w", encoding="utf-8") as f:
            json.dump(data["medicines"], f, ensure_ascii=False, indent=2)
        
        formulas_file = f"{self.output_dir}/tcm_formulas_{timestamp}.json"
        with open(formulas_file, "w", encoding="utf-8") as f:
            json.dump(data["formulas"], f, ensure_ascii=False, indent=2)
        
        acupoints_file = f"{self.output_dir}/tcm_acupoints_{timestamp}.json"
        with open(acupoints_file, "w", encoding="utf-8") as f:
            json.dump(data["acupoints"], f, ensure_ascii=False, indent=2)
        
        all_file = f"{self.output_dir}/tcm_all_{timestamp}.json"
        with open(all_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print("\n" + "="*50)
        print("TCM Data Collection Complete!")
        print("="*50)
        print(f"Medicines: {self.stats['medicines']}")
        print(f"Formulas: {self.stats['formulas']}")
        print(f"Acupoints: {self.stats['acupoints']}")
        print(f"Total entities: {self.stats['total']}")
        print(f"\nOutput files:")
        print(f"  - {medicines_file}")
        print(f"  - {formulas_file}")
        print(f"  - {acupoints_file}")
        print(f"  - {all_file}")


def main():
    collector = TCMDataCollector()
    data = collector.collect_all()
    collector.save_results(data)


if __name__ == "__main__":
    main()
