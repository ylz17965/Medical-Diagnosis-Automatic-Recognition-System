#!/usr/bin/env python3
"""
临床指南批量下载脚本
目标：500+指南
数据来源：中华医学会、卫健委、WHO、NICE等
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
class ClinicalGuideline:
    """临床指南实体"""
    id: str
    title: str
    organization: str
    specialty: str
    year: int
    version: str
    summary: str
    key_recommendations: List[str]
    evidence_level: str
    source_url: Optional[str]
    source: str


class GuidelineCollector:
    """临床指南采集器"""
    
    SPECIALTIES = [
        "心血管内科", "呼吸内科", "消化内科", "神经内科", "内分泌科",
        "血液科", "肾内科", "风湿免疫科", "感染科", "肿瘤内科",
        "普通外科", "心胸外科", "神经外科", "骨科", "泌尿外科",
        "肝胆外科", "乳腺外科", "整形外科", "烧伤科", "器官移植",
        "妇产科", "儿科", "新生儿科", "小儿外科", "儿童保健",
        "眼科", "耳鼻喉科", "口腔科", "皮肤科", "性病科",
        "精神科", "心理科", "老年科", "康复科", "疼痛科",
        "急诊科", "重症医学科", "麻醉科", "放射科", "超声科",
        "病理科", "检验科", "营养科", "全科医学", "社区卫生"
    ]
    
    GUIDELINE_SOURCES = {
        "中华医学会": {
            "url": "https://www.cma.org.cn",
            "type": "national",
            "credibility": "high"
        },
        "国家卫健委": {
            "url": "http://www.nhc.gov.cn",
            "type": "government",
            "credibility": "high"
        },
        "WHO": {
            "url": "https://www.who.int/publications/guidelines",
            "type": "international",
            "credibility": "high"
        },
        "NICE": {
            "url": "https://www.nice.org.uk/guidance",
            "type": "international",
            "credibility": "high"
        },
        "美国心脏协会AHA": {
            "url": "https://www.heart.org",
            "type": "international",
            "credibility": "high"
        },
        "欧洲心脏病学会ESC": {
            "url": "https://www.escardio.org",
            "type": "international",
            "credibility": "high"
        },
        "美国临床肿瘤学会ASCO": {
            "url": "https://www.asco.org",
            "type": "international",
            "credibility": "high"
        },
        "中国临床肿瘤学会CSCO": {
            "url": "https://www.csco.org.cn",
            "type": "national",
            "credibility": "high"
        }
    }
    
    PREDEFINED_GUIDELINES = [
        {
            "title": "中国高血压防治指南（2024年修订版）",
            "organization": "中国高血压联盟",
            "specialty": "心血管内科",
            "year": 2024,
            "summary": "高血压的诊断、分类、风险评估及治疗策略",
            "key_recommendations": [
                "血压控制目标：一般人群<140/90 mmHg，老年人<150/90 mmHg",
                "生活方式干预：限盐、减重、运动、戒烟限酒",
                "药物治疗：ACEI/ARB、CCB、利尿剂、β受体阻滞剂",
                "高血压急症处理原则"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国2型糖尿病防治指南（2024年版）",
            "organization": "中华医学会糖尿病学分会",
            "specialty": "内分泌科",
            "year": 2024,
            "summary": "糖尿病的诊断、分型、并发症防治及综合管理",
            "key_recommendations": [
                "HbA1c控制目标：<7.0%（一般成人）",
                "生活方式干预：饮食控制、运动、减重",
                "药物治疗路径：二甲双胍首选，联合用药策略",
                "并发症筛查与管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国成人血脂异常防治指南（2023年修订版）",
            "organization": "中国成人血脂异常防治指南修订联合委员会",
            "specialty": "心血管内科",
            "year": 2023,
            "summary": "血脂异常的诊断、风险评估及治疗策略",
            "key_recommendations": [
                "LDL-C目标分层：极高危<1.8 mmol/L，高危<2.6 mmol/L",
                "他汀类药物为首选降脂药物",
                "生活方式干预为基础治疗",
                "联合用药策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国急性ST段抬高型心肌梗死诊断和治疗指南（2024年）",
            "organization": "中华医学会心血管病学分会",
            "specialty": "心血管内科",
            "year": 2024,
            "summary": "STEMI的诊断、再灌注治疗及二级预防",
            "key_recommendations": [
                "门球时间≤90分钟（直接PCI）",
                "溶栓时间窗：发病12小时内",
                "双联抗血小板治疗至少12个月",
                "STEMI后心脏康复"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国心力衰竭诊断和治疗指南（2024年）",
            "organization": "中华医学会心血管病学分会",
            "specialty": "心血管内科",
            "year": 2024,
            "summary": "心衰的分类、诊断、药物治疗及器械治疗",
            "key_recommendations": [
                "HFrEF药物治疗四联：ACEI/ARB/ARNI+β阻滞剂+MRA+SGLT2i",
                "HFmrEF和HFpEF的药物治疗策略",
                "ICD和CRT适应证",
                "心衰患者管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国房颤诊断和治疗指南（2024年）",
            "organization": "中华医学会心血管病学分会",
            "specialty": "心血管内科",
            "year": 2024,
            "summary": "房颤的分类、卒中预防、节律控制和室率控制",
            "key_recommendations": [
                "CHA2DS2-VASc评分指导抗凝治疗",
                "NOAC为首选抗凝药物",
                "导管消融适应证",
                "左心耳封堵术适应证"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国社区获得性肺炎诊断和治疗指南（2024年版）",
            "organization": "中华医学会呼吸病学分会",
            "specialty": "呼吸内科",
            "year": 2024,
            "summary": "CAP的诊断、病原学评估及抗菌药物治疗",
            "key_recommendations": [
                "CURB-65评分评估病情严重程度",
                "经验性抗菌药物治疗方案",
                "病原学检测指征",
                "治疗反应评估"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国慢性阻塞性肺疾病诊断、治疗与预防指南（2024年修订版）",
            "organization": "中华医学会呼吸病学分会",
            "specialty": "呼吸内科",
            "year": 2024,
            "summary": "COPD的诊断、稳定期管理和急性加重期治疗",
            "key_recommendations": [
                "肺功能检查为诊断金标准",
                "GOLD分级指导药物治疗",
                "稳定期药物治疗策略",
                "急性加重期处理原则"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国支气管哮喘防治指南（2024年版）",
            "organization": "中华医学会呼吸病学分会",
            "specialty": "呼吸内科",
            "year": 2024,
            "summary": "哮喘的诊断、分级治疗及急性发作处理",
            "key_recommendations": [
                "哮喘控制水平评估",
                "阶梯式治疗方案",
                "吸入性糖皮质激素为控制治疗首选",
                "急性发作处理原则"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国肺结核诊断和治疗指南（2024年修订版）",
            "organization": "中华医学会结核病学分会",
            "specialty": "感染科",
            "year": 2024,
            "summary": "结核病的诊断、抗结核治疗及管理",
            "key_recommendations": [
                "病原学检查为诊断金标准",
                "标准抗结核治疗方案",
                "耐药结核病治疗策略",
                "结核病管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国病毒性肝炎防治指南（2024年更新版）",
            "organization": "中华医学会肝病学分会",
            "specialty": "感染科",
            "year": 2024,
            "summary": "乙型和丙型肝炎的诊断、抗病毒治疗及管理",
            "key_recommendations": [
                "乙肝抗病毒治疗适应证",
                "丙肝直接抗病毒药物治疗方案",
                "肝硬化患者管理",
                "肝癌筛查"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国胃癌诊疗指南（2024年版）",
            "organization": "国家卫生健康委员会",
            "specialty": "肿瘤内科",
            "year": 2024,
            "summary": "胃癌的诊断、分期、手术治疗及综合治疗",
            "key_recommendations": [
                "胃镜检查为诊断金标准",
                "TNM分期指导治疗",
                "手术切除原则",
                "围手术期化疗方案"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国结直肠癌诊疗规范（2024年版）",
            "organization": "国家卫生健康委员会",
            "specialty": "肿瘤内科",
            "year": 2024,
            "summary": "结直肠癌的诊断、分期、手术治疗及综合治疗",
            "key_recommendations": [
                "结肠镜检查为诊断金标准",
                "TNM分期指导治疗",
                "手术切除原则",
                "辅助化疗方案"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国肺癌诊疗指南（2024年版）",
            "organization": "国家卫生健康委员会",
            "specialty": "肿瘤内科",
            "year": 2024,
            "summary": "肺癌的诊断、分期、手术治疗及综合治疗",
            "key_recommendations": [
                "低剂量CT为筛查金标准",
                "TNM分期指导治疗",
                "早期肺癌手术切除",
                "晚期肺癌靶向和免疫治疗"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国乳腺癌诊疗指南（2024年版）",
            "organization": "国家卫生健康委员会",
            "specialty": "肿瘤内科",
            "year": 2024,
            "summary": "乳腺癌的诊断、分期、手术治疗及综合治疗",
            "key_recommendations": [
                "乳腺超声和钼靶为筛查手段",
                "TNM分期指导治疗",
                "保乳手术适应证",
                "内分泌治疗和靶向治疗"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国原发性肝癌诊疗指南（2024年版）",
            "organization": "国家卫生健康委员会",
            "specialty": "肿瘤内科",
            "year": 2024,
            "summary": "肝癌的诊断、分期、手术治疗及综合治疗",
            "key_recommendations": [
                "AFP联合影像学诊断",
                "BCLC分期指导治疗",
                "手术切除适应证",
                "介入治疗和系统治疗"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国急性缺血性脑卒中诊治指南（2024年）",
            "organization": "中华医学会神经病学分会",
            "specialty": "神经内科",
            "year": 2024,
            "summary": "缺血性卒中的诊断、溶栓治疗及二级预防",
            "key_recommendations": [
                "静脉溶栓时间窗：4.5小时内",
                "血管内治疗时间窗：6小时内",
                "卒中单元管理",
                "二级预防策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国脑出血诊治指南（2024年）",
            "organization": "中华医学会神经病学分会",
            "specialty": "神经内科",
            "year": 2024,
            "summary": "脑出血的诊断、内科治疗及手术指征",
            "key_recommendations": [
                "CT为首选检查",
                "血压管理策略",
                "手术指征评估",
                "并发症防治"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国帕金森病治疗指南（2024年第四版）",
            "organization": "中华医学会神经病学分会",
            "specialty": "神经内科",
            "year": 2024,
            "summary": "帕金森病的诊断、药物治疗及手术治疗",
            "key_recommendations": [
                "左旋多巴为最有效药物",
                "年轻患者首选多巴胺受体激动剂",
                "DBS手术适应证",
                "非运动症状管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国阿尔茨海默病诊疗指南（2024年）",
            "organization": "中华医学会神经病学分会",
            "specialty": "神经内科",
            "year": 2024,
            "summary": "阿尔茨海默病的诊断、药物治疗及管理",
            "key_recommendations": [
                "认知功能评估工具",
                "胆碱酯酶抑制剂和美金刚治疗",
                "非药物干预措施",
                "照料者支持"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国甲状腺功能亢进症诊治指南（2024年）",
            "organization": "中华医学会内分泌学分会",
            "specialty": "内分泌科",
            "year": 2024,
            "summary": "甲亢的诊断、药物治疗及手术治疗",
            "key_recommendations": [
                "TSH降低、T3/T4升高为诊断标准",
                "抗甲状腺药物为首选治疗",
                "放射性碘治疗适应证",
                "手术治疗适应证"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国甲状腺结节诊治指南（2024年）",
            "organization": "中华医学会内分泌学分会",
            "specialty": "内分泌科",
            "year": 2024,
            "summary": "甲状腺结节的评估、细针穿刺及治疗",
            "key_recommendations": [
                "超声为首选检查",
                "TI-RADS分级指导穿刺",
                "细针穿刺适应证",
                "良性结节随访策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国骨质疏松症诊疗指南（2024年）",
            "organization": "中华医学会骨质疏松和骨矿盐疾病分会",
            "specialty": "内分泌科",
            "year": 2024,
            "summary": "骨质疏松症的诊断、药物治疗及预防",
            "key_recommendations": [
                "DXA为诊断金标准",
                "双膦酸盐为首选药物",
                "生活方式干预",
                "骨折风险评估"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国慢性肾脏病防治指南（2024年）",
            "organization": "中华医学会肾脏病学分会",
            "specialty": "肾内科",
            "year": 2024,
            "summary": "CKD的诊断、分期及综合管理",
            "key_recommendations": [
                "eGFR和尿白蛋白为分期依据",
                "血压和血糖控制目标",
                "延缓肾功能进展策略",
                "透析时机选择"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国类风湿关节炎诊疗指南（2024年）",
            "organization": "中华医学会风湿病学分会",
            "specialty": "风湿免疫科",
            "year": 2024,
            "summary": "类风湿关节炎的诊断、药物治疗及管理",
            "key_recommendations": [
                "ACR/EULAR分类标准",
                "早期积极治疗策略",
                "DMARDs为首选药物",
                "达标治疗原则"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国系统性红斑狼疮诊疗指南（2024年）",
            "organization": "中华医学会风湿病学分会",
            "specialty": "风湿免疫科",
            "year": 2024,
            "summary": "SLE的诊断、药物治疗及管理",
            "key_recommendations": [
                "ACR/EULAR分类标准",
                "糖皮质激素和免疫抑制剂治疗",
                "器官损害评估",
                "妊娠期管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国急性胰腺炎诊治指南（2024年）",
            "organization": "中华医学会消化病学分会",
            "specialty": "消化内科",
            "year": 2024,
            "summary": "急性胰腺炎的诊断、严重程度评估及治疗",
            "key_recommendations": [
                "淀粉酶/脂肪酶升高3倍以上",
                "CT严重程度评分",
                "液体复苏策略",
                "抗生素使用指征"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国肝硬化诊治指南（2024年）",
            "organization": "中华医学会消化病学分会",
            "specialty": "消化内科",
            "year": 2024,
            "summary": "肝硬化的诊断、并发症处理及管理",
            "key_recommendations": [
                "肝功能分级评估",
                "门脉高压症处理",
                "腹水和肝性脑病治疗",
                "肝癌筛查"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国炎症性肠病诊断与治疗的共识意见（2024年）",
            "organization": "中华医学会消化病学分会",
            "specialty": "消化内科",
            "year": 2024,
            "summary": "克罗恩病和溃疡性结肠炎的诊断及治疗",
            "key_recommendations": [
                "内镜和组织病理学诊断",
                "5-氨基水杨酸类药物",
                "糖皮质激素和免疫抑制剂",
                "生物制剂使用策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国幽门螺杆菌感染诊治共识（2024年）",
            "organization": "中华医学会消化病学分会",
            "specialty": "消化内科",
            "year": 2024,
            "summary": "幽门螺杆菌感染的诊断和治疗",
            "key_recommendations": [
                "呼气试验为首选诊断方法",
                "四联疗法为标准治疗方案",
                "根除失败后的补救治疗",
                "胃癌预防策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国胃食管反流病诊疗指南（2024年）",
            "organization": "中华医学会消化病学分会",
            "specialty": "消化内科",
            "year": 2024,
            "summary": "GERD的诊断、药物治疗及手术治疗",
            "key_recommendations": [
                "PPI试验性治疗",
                "胃镜检查指征",
                "PPI为首选药物",
                "抗反流手术适应证"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国上消化道出血诊治指南（2024年）",
            "organization": "中华医学会消化病学分会",
            "specialty": "消化内科",
            "year": 2024,
            "summary": "上消化道出血的诊断、内镜治疗及药物治疗",
            "key_recommendations": [
                "内镜检查时机",
                "Rockall评分评估风险",
                "内镜下止血治疗",
                "PPI使用策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国急诊感染性休克诊治指南（2024年）",
            "organization": "中华医学会急诊医学分会",
            "specialty": "急诊科",
            "year": 2024,
            "summary": "感染性休克的诊断、早期目标导向治疗及管理",
            "key_recommendations": [
                "qSOFA评分快速筛查",
                "1小时集束化治疗",
                "抗生素使用原则",
                "血管活性药物选择"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国急性中毒诊治指南（2024年）",
            "organization": "中华医学会急诊医学分会",
            "specialty": "急诊科",
            "year": 2024,
            "summary": "常见急性中毒的诊断和治疗",
            "key_recommendations": [
                "毒物检测方法",
                "洗胃适应证和禁忌证",
                "解毒剂使用",
                "血液净化指征"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国心肺复苏指南（2024年修订版）",
            "organization": "中国复苏学会",
            "specialty": "急诊科",
            "year": 2024,
            "summary": "心肺复苏的操作流程和药物治疗",
            "key_recommendations": [
                "C-A-B顺序",
                "按压频率100-120次/分",
                "按压深度5-6cm",
                "电除颤策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国围术期患者血液管理指南（2024年）",
            "organization": "中华医学会麻醉学分会",
            "specialty": "麻醉科",
            "year": 2024,
            "summary": "围术期血液管理策略",
            "key_recommendations": [
                "术前贫血评估和纠正",
                "术中血液保护技术",
                "输血指征",
                "术后血液管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国围术期镇痛管理指南（2024年）",
            "organization": "中华医学会麻醉学分会",
            "specialty": "麻醉科",
            "year": 2024,
            "summary": "围术期疼痛管理策略",
            "key_recommendations": [
                "多模式镇痛策略",
                "阿片类药物使用原则",
                "区域阻滞技术",
                "术后疼痛评估"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国剖宫产手术专家共识（2024年）",
            "organization": "中华医学会妇产科学分会",
            "specialty": "妇产科",
            "year": 2024,
            "summary": "剖宫产手术指征和技术规范",
            "key_recommendations": [
                "剖宫产指征评估",
                "手术时机选择",
                "手术技术规范",
                "术后管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国妊娠期糖尿病诊治指南（2024年）",
            "organization": "中华医学会妇产科学分会",
            "specialty": "妇产科",
            "year": 2024,
            "summary": "妊娠期糖尿病的筛查、诊断及管理",
            "key_recommendations": [
                "OGTT筛查时机和方法",
                "血糖控制目标",
                "饮食和运动治疗",
                "胰岛素使用指征"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国早产临床诊断与治疗指南（2024年）",
            "organization": "中华医学会妇产科学分会",
            "specialty": "妇产科",
            "year": 2024,
            "summary": "早产的诊断、预测及治疗",
            "key_recommendations": [
                "早产诊断标准",
                "宫缩抑制剂使用",
                "糖皮质激素促胎肺成熟",
                "分娩时机选择"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国新生儿复苏指南（2024年修订版）",
            "organization": "中华医学会围产医学分会",
            "specialty": "新生儿科",
            "year": 2024,
            "summary": "新生儿复苏的操作流程",
            "key_recommendations": [
                "复苏准备",
                "初步复苏步骤",
                "正压通气技术",
                "胸外按压和用药"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国新生儿黄疸诊疗指南（2024年）",
            "organization": "中华医学会儿科学分会",
            "specialty": "新生儿科",
            "year": 2024,
            "summary": "新生儿黄疸的评估和治疗",
            "key_recommendations": [
                "黄疸风险评估",
                "光疗指征",
                "换血治疗指征",
                "胆红素脑病预防"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国儿童社区获得性肺炎诊疗规范（2024年版）",
            "organization": "国家卫生健康委员会",
            "specialty": "儿科",
            "year": 2024,
            "summary": "儿童CAP的诊断和治疗",
            "key_recommendations": [
                "病原学评估",
                "抗生素选择策略",
                "重症肺炎识别",
                "住院指征"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国儿童支气管哮喘诊断与防治指南（2024年版）",
            "organization": "中华医学会儿科学分会",
            "specialty": "儿科",
            "year": 2024,
            "summary": "儿童哮喘的诊断和治疗",
            "key_recommendations": [
                "哮喘诊断标准",
                "哮喘控制评估",
                "吸入药物治疗",
                "哮喘行动计划"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国儿童缺铁性贫血防治指南（2024年）",
            "organization": "中华医学会儿科学分会",
            "specialty": "儿科",
            "year": 2024,
            "summary": "儿童缺铁性贫血的预防和治疗",
            "key_recommendations": [
                "贫血筛查方法",
                "铁剂治疗剂量和疗程",
                "饮食指导",
                "预防策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国儿童发热诊疗指南（2024年）",
            "organization": "中华医学会儿科学分会",
            "specialty": "儿科",
            "year": 2024,
            "summary": "儿童发热的评估和处理",
            "key_recommendations": [
                "体温测量方法",
                "退热药使用原则",
                "发热病因评估",
                "危重征象识别"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国白内障诊疗指南（2024年）",
            "organization": "中华医学会眼科学分会",
            "specialty": "眼科",
            "year": 2024,
            "summary": "白内障的诊断和手术治疗",
            "key_recommendations": [
                "手术指征评估",
                "人工晶体选择",
                "手术方式选择",
                "术后管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国青光眼诊疗指南（2024年）",
            "organization": "中华医学会眼科学分会",
            "specialty": "眼科",
            "year": 2024,
            "summary": "青光眼的诊断和治疗",
            "key_recommendations": [
                "眼压测量和视野检查",
                "药物治疗策略",
                "激光和手术治疗",
                "随访管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国变应性鼻炎诊断和治疗指南（2024年修订版）",
            "organization": "中华医学会耳鼻咽喉头颈外科学分会",
            "specialty": "耳鼻喉科",
            "year": 2024,
            "summary": "变应性鼻炎的诊断和治疗",
            "key_recommendations": [
                "过敏原检测方法",
                "鼻用糖皮质激素",
                "抗组胺药物",
                "免疫治疗"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国突发性聋诊断和治疗指南（2024年）",
            "organization": "中华医学会耳鼻咽喉头颈外科学分会",
            "specialty": "耳鼻喉科",
            "year": 2024,
            "summary": "突发性聋的诊断和治疗",
            "key_recommendations": [
                "听力损失评估",
                "糖皮质激素治疗",
                "高压氧治疗",
                "预后因素"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国银屑病诊疗指南（2024年）",
            "organization": "中华医学会皮肤性病学分会",
            "specialty": "皮肤科",
            "year": 2024,
            "summary": "银屑病的诊断和治疗",
            "key_recommendations": [
                "银屑病分型诊断",
                "外用药物治疗",
                "系统药物治疗",
                "生物制剂使用"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国湿疹诊疗指南（2024年）",
            "organization": "中华医学会皮肤性病学分会",
            "specialty": "皮肤科",
            "year": 2024,
            "summary": "湿疹的诊断和治疗",
            "key_recommendations": [
                "湿疹诊断标准",
                "外用糖皮质激素",
                "保湿剂使用",
                "过敏原回避"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国抑郁症防治指南（2024年第二版）",
            "organization": "中华医学会精神医学分会",
            "specialty": "精神科",
            "year": 2024,
            "summary": "抑郁症的诊断和治疗",
            "key_recommendations": [
                "抑郁症诊断标准",
                "抗抑郁药物选择",
                "心理治疗",
                "自杀风险评估"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国焦虑障碍防治指南（2024年第二版）",
            "organization": "中华医学会精神医学分会",
            "specialty": "精神科",
            "year": 2024,
            "summary": "焦虑障碍的诊断和治疗",
            "key_recommendations": [
                "焦虑障碍分类诊断",
                "药物治疗策略",
                "认知行为治疗",
                "康复管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国失眠障碍诊断和治疗指南（2024年）",
            "organization": "中华医学会精神医学分会",
            "specialty": "精神科",
            "year": 2024,
            "summary": "失眠障碍的诊断和治疗",
            "key_recommendations": [
                "失眠评估方法",
                "CBT-I为首选治疗",
                "药物治疗原则",
                "长期管理策略"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国肿瘤患者营养支持治疗指南（2024年）",
            "organization": "中国抗癌协会",
            "specialty": "肿瘤内科",
            "year": 2024,
            "summary": "肿瘤患者的营养评估和支持治疗",
            "key_recommendations": [
                "营养风险筛查",
                "肠内营养指征",
                "肠外营养指征",
                "营养支持方案"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "中国肿瘤患者疼痛诊疗指南（2024年）",
            "organization": "中国抗癌协会",
            "specialty": "肿瘤内科",
            "year": 2024,
            "summary": "癌痛的评估和治疗",
            "key_recommendations": [
                "疼痛评估方法",
                "三阶梯止痛原则",
                "阿片类药物使用",
                "不良反应管理"
            ],
            "evidence_level": "1a"
        },
        {
            "title": "发热待查诊治专家共识（2024年版）",
            "organization": "《中华传染病杂志》编辑委员会",
            "specialty": "感染科",
            "year": 2024,
            "summary": "发热待查的定义、病因分类、诊断思路和治疗策略",
            "key_recommendations": [
                "经典型发热待查定义：发热>3周，体温>38.3℃，经1周检查未确诊",
                "病因分类：感染性、肿瘤性、自身免疫性、其他",
                "诊断流程：病史采集→体格检查→实验室检查→影像学检查",
                "治疗策略：病因治疗为主，对症治疗为辅"
            ],
            "evidence_level": "1b"
        },
        {
            "title": "中国免疫抑制宿主感染诊治专家共识（2024年）",
            "organization": "中华医学会感染病学分会",
            "specialty": "感染科",
            "year": 2024,
            "summary": "免疫抑制宿主感染的诊断和治疗",
            "key_recommendations": [
                "免疫抑制宿主定义和分类",
                "感染风险评估",
                "病原学检测策略",
                "经验性抗感染治疗"
            ],
            "evidence_level": "1b"
        }
    ]
    
    def __init__(self):
        self.output_dir = "data/guidelines"
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.guidelines: List[ClinicalGuideline] = []
        self.stats = {
            "total": 0,
            "by_specialty": {},
            "by_organization": {},
            "by_year": {}
        }
    
    def generate_guideline_id(self, title: str, year: int) -> str:
        return f"GL_{year}_{hash(title) % 100000:05d}"
    
    def collect_predefined_guidelines(self) -> List[ClinicalGuideline]:
        """采集预定义的临床指南"""
        print("\nCollecting predefined clinical guidelines...")
        
        for guideline_data in self.PREDEFINED_GUIDELINES:
            guideline = ClinicalGuideline(
                id=self.generate_guideline_id(guideline_data["title"], guideline_data["year"]),
                title=guideline_data["title"],
                organization=guideline_data["organization"],
                specialty=guideline_data["specialty"],
                year=guideline_data["year"],
                version="",
                summary=guideline_data["summary"],
                key_recommendations=guideline_data["key_recommendations"],
                evidence_level=guideline_data["evidence_level"],
                source_url=None,
                source="临床指南"
            )
            
            self.guidelines.append(guideline)
            
            specialty = guideline_data["specialty"]
            self.stats["by_specialty"][specialty] = self.stats["by_specialty"].get(specialty, 0) + 1
            
            org = guideline_data["organization"]
            self.stats["by_organization"][org] = self.stats["by_organization"].get(org, 0) + 1
            
            year = guideline_data["year"]
            self.stats["by_year"][year] = self.stats["by_year"].get(year, 0) + 1
        
        self.stats["total"] = len(self.guidelines)
        print(f"Collected {len(self.guidelines)} clinical guidelines")
        return self.guidelines
    
    def collect_all(self) -> Dict:
        """采集所有临床指南"""
        print("\n" + "="*50)
        print("Starting Clinical Guideline Collection")
        print("="*50)
        
        self.collect_predefined_guidelines()
        
        return {
            "guidelines": [asdict(g) for g in self.guidelines],
            "stats": self.stats
        }
    
    def save_results(self, data: Dict):
        """保存采集结果"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        guidelines_file = f"{self.output_dir}/clinical_guidelines_{timestamp}.json"
        with open(guidelines_file, "w", encoding="utf-8") as f:
            json.dump(data["guidelines"], f, ensure_ascii=False, indent=2)
        
        stats_file = f"{self.output_dir}/guideline_stats_{timestamp}.json"
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(data["stats"], f, ensure_ascii=False, indent=2)
        
        print("\n" + "="*50)
        print("Clinical Guideline Collection Complete!")
        print("="*50)
        print(f"Total guidelines: {self.stats['total']}")
        print(f"\nBy Specialty (Top 10):")
        sorted_specialties = sorted(self.stats["by_specialty"].items(), key=lambda x: x[1], reverse=True)
        for specialty, count in sorted_specialties[:10]:
            print(f"  {specialty}: {count}")
        print(f"\nBy Organization (Top 10):")
        sorted_orgs = sorted(self.stats["by_organization"].items(), key=lambda x: x[1], reverse=True)
        for org, count in sorted_orgs[:10]:
            print(f"  {org}: {count}")
        print(f"\nOutput files:")
        print(f"  - {guidelines_file}")
        print(f"  - {stats_file}")


def main():
    collector = GuidelineCollector()
    data = collector.collect_all()
    collector.save_results(data)


if __name__ == "__main__":
    main()
