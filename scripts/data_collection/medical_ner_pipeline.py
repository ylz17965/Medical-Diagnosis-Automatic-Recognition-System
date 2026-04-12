#!/usr/bin/env python3
"""
医学NER流水线
功能：实体识别、UMLS标准化、关系抽取、证据等级标注
"""

import json
import os
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict


@dataclass
class MedicalEntity:
    """医学实体"""
    id: str
    text: str
    type: str
    start: int
    end: int
    cui: Optional[str]
    standard_name: Optional[str]
    confidence: float


@dataclass
class MedicalRelation:
    """医学关系"""
    id: str
    source_id: str
    source_type: str
    source_text: str
    target_id: str
    target_type: str
    target_text: str
    relation_type: str
    confidence: float


@dataclass
class ProcessedDocument:
    """处理后的文档"""
    doc_id: str
    original_text: str
    entities: List[MedicalEntity]
    relations: List[MedicalRelation]
    evidence_level: str
    confidence: float
    metadata: Dict


class MedicalNLPipeline:
    """医学NER流水线"""
    
    ENTITY_TYPES = {
        "DISEASE": {
            "patterns": [
                r"[\u4e00-\u9fa5]+(?:病|症|综合征|炎|瘤|癌|肿瘤|畸形|损伤|功能障碍)",
                r"(?:高血压|糖尿病|冠心病|心衰|房颤|脑梗|脑出血|肺炎|哮喘|COPD)",
                r"(?:肺癌|胃癌|肝癌|乳腺癌|结直肠癌|前列腺癌)",
                r"(?:感冒|流感|发热|咳嗽|头痛|腹痛|胸痛|腰痛)",
            ],
            "priority": 1
        },
        "SYMPTOM": {
            "patterns": [
                r"[\u4e00-\u9fa5]+(?:痛|疼|胀|闷|悸|晕|咳|喘|泻|秘|血|热|寒|汗)",
                r"(?:发热|咳嗽|咳痰|咯血|呼吸困难|胸闷|心悸|头痛|头晕)",
                r"(?:恶心|呕吐|腹痛|腹泻|便秘|便血|黄疸|水肿)",
                r"(?:乏力|消瘦|贫血|出血|紫癜|皮疹|瘙痒)",
            ],
            "priority": 2
        },
        "DRUG": {
            "patterns": [
                r"[\u4e00-\u9fa5]+(?:片|胶囊|注射液|口服液|颗粒|丸|散|膏|贴)",
                r"(?:阿司匹林|氯吡格雷|阿托伐他汀|氨氯地平|缬沙坦|厄贝沙坦)",
                r"(?:二甲双胍|格列美脲|胰岛素|左甲状腺素|奥美拉唑)",
                r"(?:头孢|青霉素|阿莫西林|左氧氟沙星|莫西沙星)",
                r"[A-Za-z]+(?:cin|mycin|olol|pril|sartan|statin|pine)",
            ],
            "priority": 3
        },
        "EXAMINATION": {
            "patterns": [
                r"[\u4e00-\u9fa5]+(?:检查|测定|试验|扫描|造影|穿刺|活检)",
                r"(?:血常规|尿常规|肝功能|肾功能|血糖|血脂|电解质)",
                r"(?:心电图|超声|CT|MRI|PET|X光|造影)",
                r"(?:胃镜|肠镜|支气管镜|穿刺活检|骨髓穿刺)",
            ],
            "priority": 4
        },
        "BODY_PART": {
            "patterns": [
                r"(?:心|肝|脾|肺|肾|脑|胃|肠|胆|胰|膀胱|前列腺|甲状腺)",
                r"(?:头|颈|胸|腹|腰|背|四肢|关节|脊柱)",
                r"(?:眼|耳|鼻|喉|口腔|牙齿|皮肤)",
            ],
            "priority": 5
        }
    }
    
    RELATION_PATTERNS = {
        "HAS_SYMPTOM": [
            (r"(.+?)(?:患者|病人)?(?:出现|表现为|伴有|并发)(.+?(?:痛|热|咳|喘|泻|血|肿|悸|晕))", "DISEASE", "SYMPTOM"),
            (r"(.+?(?:病|症|炎))的主要?症状(?:包括|为|有)(.+)", "DISEASE", "SYMPTOM"),
        ],
        "TREATED_BY": [
            (r"(.+?(?:病|症|炎))(?:患者)?(?:使用|服用|应用|治疗)(.+?(?:片|胶囊|注射液|药))", "DISEASE", "DRUG"),
            (r"(.+?(?:药|片|胶囊))(?:用于|治疗)(.+?(?:病|症|炎))", "DRUG", "DISEASE"),
        ],
        "NEEDS_EXAMINATION": [
            (r"(.+?(?:病|症|炎))(?:需要|应|建议)(?:进行|做)(.+?(?:检查|测定|试验|扫描))", "DISEASE", "EXAMINATION"),
            (r"(.+?(?:检查|测定|试验))(?:用于|诊断)(.+?(?:病|症|炎))", "EXAMINATION", "DISEASE"),
        ],
        "LOCATED_AT": [
            (r"(.+?(?:痛|热|肿|炎))(?:位于|发生在)(.+?(?:部|区|器官))", "SYMPTOM", "BODY_PART"),
        ],
        "HAS_SIDE_EFFECT": [
            (r"(.+?(?:药|片|胶囊))(?:可能|可)引起(.+?(?:反应|症状|不适))", "DRUG", "SYMPTOM"),
            (r"(.+?(?:药|片|胶囊))的(?:主要)?副作用(?:包括|为)(.+)", "DRUG", "SYMPTOM"),
        ]
    }
    
    EVIDENCE_KEYWORDS = {
        "1a": ["meta分析", "系统评价", "荟萃分析", "meta-analysis", "systematic review"],
        "1b": ["随机对照试验", "RCT", "randomized controlled trial", "双盲"],
        "2a": ["队列研究", "前瞻性研究", "cohort study", "prospective"],
        "2b": ["病例对照研究", "回顾性研究", "case-control", "retrospective"],
        "3a": ["病例系列", "病例报告", "case series", "case report"],
        "4": ["专家共识", "指南", "consensus", "guideline", "expert opinion"],
        "5": ["综述", "叙述性综述", "review", "narrative"]
    }
    
    UMLS_MAPPINGS = {
        "高血压": {"cui": "C0020538", "standard_name": "Hypertension"},
        "糖尿病": {"cui": "C0011847", "standard_name": "Diabetes Mellitus"},
        "冠心病": {"cui": "C0010054", "standard_name": "Coronary Heart Disease"},
        "心衰": {"cui": "C0018801", "standard_name": "Heart Failure"},
        "房颤": {"cui": "C0018878", "standard_name": "Atrial Fibrillation"},
        "脑梗": {"cui": "C0038454", "standard_name": "Cerebral Infarction"},
        "脑出血": {"cui": "C0038450", "standard_name": "Cerebral Hemorrhage"},
        "肺炎": {"cui": "C0032285", "standard_name": "Pneumonia"},
        "哮喘": {"cui": "C0004096", "standard_name": "Asthma"},
        "COPD": {"cui": "C0024117", "standard_name": "Chronic Obstructive Pulmonary Disease"},
        "肺癌": {"cui": "C0024121", "standard_name": "Lung Cancer"},
        "胃癌": {"cui": "C0024623", "standard_name": "Gastric Cancer"},
        "肝癌": {"cui": "C0023903", "standard_name": "Liver Cancer"},
        "乳腺癌": {"cui": "C0006142", "standard_name": "Breast Cancer"},
        "结直肠癌": {"cui": "C0009402", "standard_name": "Colorectal Cancer"},
        "阿司匹林": {"cui": "C0004057", "standard_name": "Aspirin"},
        "氯吡格雷": {"cui": "C0098224", "standard_name": "Clopidogrel"},
        "阿托伐他汀": {"cui": "C0253076", "standard_name": "Atorvastatin"},
        "二甲双胍": {"cui": "C0025598", "standard_name": "Metformin"},
        "胰岛素": {"cui": "C0021641", "standard_name": "Insulin"},
    }
    
    def __init__(self):
        self.output_dir = "data/processed"
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.entity_counter = 0
        self.relation_counter = 0
        
        self.stats = {
            "total_documents": 0,
            "total_entities": 0,
            "total_relations": 0,
            "entities_by_type": defaultdict(int),
            "relations_by_type": defaultdict(int),
            "evidence_levels": defaultdict(int)
        }
    
    def generate_entity_id(self) -> str:
        self.entity_counter += 1
        return f"ENT_{self.entity_counter:08d}"
    
    def generate_relation_id(self) -> str:
        self.relation_counter += 1
        return f"REL_{self.relation_counter:08d}"
    
    def extract_entities(self, text: str) -> List[MedicalEntity]:
        """提取医学实体"""
        entities = []
        
        for entity_type, config in self.ENTITY_TYPES.items():
            for pattern in config["patterns"]:
                try:
                    for match in re.finditer(pattern, text, re.IGNORECASE):
                        entity_text = match.group(0)
                        
                        is_duplicate = any(
                            e.start == match.start() and e.end == match.end()
                            for e in entities
                        )
                        
                        if not is_duplicate:
                            mapping = self.UMLS_MAPPINGS.get(entity_text, {})
                            
                            entity = MedicalEntity(
                                id=self.generate_entity_id(),
                                text=entity_text,
                                type=entity_type,
                                start=match.start(),
                                end=match.end(),
                                cui=mapping.get("cui"),
                                standard_name=mapping.get("standard_name"),
                                confidence=0.85
                            )
                            entities.append(entity)
                            
                            self.stats["entities_by_type"][entity_type] += 1
                except re.error:
                    continue
        
        entities.sort(key=lambda e: (e.start, -self.ENTITY_TYPES[e.type]["priority"]))
        
        return entities
    
    def extract_relations(self, text: str, entities: List[MedicalEntity]) -> List[MedicalRelation]:
        """提取医学关系"""
        relations = []
        
        entity_map = {e.text: e for e in entities}
        
        for relation_type, patterns in self.RELATION_PATTERNS.items():
            for pattern, source_type, target_type in patterns:
                try:
                    for match in re.finditer(pattern, text):
                        groups = match.groups()
                        if len(groups) >= 2:
                            source_text = groups[0].strip()
                            target_text = groups[1].strip()
                            
                            source_entity = entity_map.get(source_text)
                            target_entity = entity_map.get(target_text)
                            
                            if source_entity and target_entity:
                                relation = MedicalRelation(
                                    id=self.generate_relation_id(),
                                    source_id=source_entity.id,
                                    source_type=source_entity.type,
                                    source_text=source_entity.text,
                                    target_id=target_entity.id,
                                    target_type=target_entity.type,
                                    target_text=target_entity.text,
                                    relation_type=relation_type,
                                    confidence=0.8
                                )
                                relations.append(relation)
                                
                                self.stats["relations_by_type"][relation_type] += 1
                except re.error:
                    continue
        
        return relations
    
    def classify_evidence(self, text: str) -> str:
        """分类证据等级"""
        text_lower = text.lower()
        
        for level, keywords in self.EVIDENCE_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    self.stats["evidence_levels"][level] += 1
                    return level
        
        self.stats["evidence_levels"]["5"] += 1
        return "5"
    
    def calculate_confidence(self, entities: List[MedicalEntity], relations: List[MedicalRelation]) -> float:
        """计算文档置信度"""
        if not entities:
            return 0.3
        
        entity_confidence = sum(e.confidence for e in entities) / len(entities)
        
        cui_coverage = sum(1 for e in entities if e.cui) / len(entities)
        
        relation_bonus = min(len(relations) * 0.05, 0.2)
        
        final_confidence = min(entity_confidence * 0.6 + cui_coverage * 0.3 + relation_bonus, 0.99)
        
        return round(final_confidence, 2)
    
    def process_document(self, doc_id: str, text: str, metadata: Dict = None) -> ProcessedDocument:
        """处理单个文档"""
        entities = self.extract_entities(text)
        relations = self.extract_relations(text, entities)
        evidence_level = self.classify_evidence(text)
        confidence = self.calculate_confidence(entities, relations)
        
        self.stats["total_documents"] += 1
        self.stats["total_entities"] += len(entities)
        self.stats["total_relations"] += len(relations)
        
        return ProcessedDocument(
            doc_id=doc_id,
            original_text=text,
            entities=entities,
            relations=relations,
            evidence_level=evidence_level,
            confidence=confidence,
            metadata=metadata or {}
        )
    
    def process_batch(self, documents: List[Dict]) -> List[ProcessedDocument]:
        """批量处理文档"""
        print(f"\nProcessing {len(documents)} documents...")
        
        results = []
        for i, doc in enumerate(documents):
            doc_id = doc.get("id", f"DOC_{i+1:05d}")
            text = doc.get("text") or doc.get("abstract") or doc.get("content", "")
            metadata = {k: v for k, v in doc.items() if k not in ["text", "abstract", "content"]}
            
            processed = self.process_document(doc_id, text, metadata)
            results.append(processed)
            
            if (i + 1) % 100 == 0:
                print(f"  Processed {i+1}/{len(documents)} documents...")
        
        return results
    
    def save_results(self, documents: List[ProcessedDocument], output_prefix: str = "processed"):
        """保存处理结果"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        all_entities = []
        all_relations = []
        doc_summaries = []
        
        for doc in documents:
            all_entities.extend([asdict(e) for e in doc.entities])
            all_relations.extend([asdict(r) for r in doc.relations])
            
            doc_summaries.append({
                "doc_id": doc.doc_id,
                "entity_count": len(doc.entities),
                "relation_count": len(doc.relations),
                "evidence_level": doc.evidence_level,
                "confidence": doc.confidence
            })
        
        entities_file = f"{self.output_dir}/{output_prefix}_entities_{timestamp}.json"
        with open(entities_file, "w", encoding="utf-8") as f:
            json.dump(all_entities, f, ensure_ascii=False, indent=2)
        
        relations_file = f"{self.output_dir}/{output_prefix}_relations_{timestamp}.json"
        with open(relations_file, "w", encoding="utf-8") as f:
            json.dump(all_relations, f, ensure_ascii=False, indent=2)
        
        summaries_file = f"{self.output_dir}/{output_prefix}_summaries_{timestamp}.json"
        with open(summaries_file, "w", encoding="utf-8") as f:
            json.dump(doc_summaries, f, ensure_ascii=False, indent=2)
        
        stats_file = f"{self.output_dir}/{output_prefix}_stats_{timestamp}.json"
        stats_to_save = {
            "total_documents": self.stats["total_documents"],
            "total_entities": self.stats["total_entities"],
            "total_relations": self.stats["total_relations"],
            "entities_by_type": dict(self.stats["entities_by_type"]),
            "relations_by_type": dict(self.stats["relations_by_type"]),
            "evidence_levels": dict(self.stats["evidence_levels"])
        }
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(stats_to_save, f, ensure_ascii=False, indent=2)
        
        print("\n" + "="*50)
        print("Medical NER Pipeline Complete!")
        print("="*50)
        print(f"Total documents: {self.stats['total_documents']}")
        print(f"Total entities: {self.stats['total_entities']}")
        print(f"Total relations: {self.stats['total_relations']}")
        print(f"\nEntities by type:")
        for entity_type, count in sorted(self.stats["entities_by_type"].items()):
            print(f"  {entity_type}: {count}")
        print(f"\nRelations by type:")
        for relation_type, count in sorted(self.stats["relations_by_type"].items()):
            print(f"  {relation_type}: {count}")
        print(f"\nEvidence levels:")
        for level, count in sorted(self.stats["evidence_levels"].items()):
            print(f"  Level {level}: {count}")
        print(f"\nOutput files:")
        print(f"  - {entities_file}")
        print(f"  - {relations_file}")
        print(f"  - {summaries_file}")
        print(f"  - {stats_file}")


def main():
    pipeline = MedicalNLPipeline()
    
    sample_documents = [
        {
            "id": "DOC_001",
            "text": "高血压患者常出现头痛、头晕等症状。治疗高血压可使用阿司匹林、氯吡格雷等药物。建议进行血压监测、心电图检查。",
            "source": "示例"
        },
        {
            "id": "DOC_002",
            "text": "糖尿病患者的主要症状包括多饮、多尿、多食和体重下降。二甲双胍是治疗2型糖尿病的首选药物。需要定期检测血糖、糖化血红蛋白。",
            "source": "示例"
        },
        {
            "id": "DOC_003",
            "text": "冠心病患者表现为胸痛、胸闷、心悸等症状。阿托伐他汀可用于降低血脂，氯吡格雷用于抗血小板治疗。冠脉造影是诊断的金标准。",
            "source": "示例"
        }
    ]
    
    results = pipeline.process_batch(sample_documents)
    pipeline.save_results(results)


if __name__ == "__main__":
    main()
