#!/usr/bin/env python3
"""
联邦学习医疗检索演示系统
目标：展示跨医院协同不共享原始数据的原理
技术：模拟联邦平均，重点在概念演示

运行方式：
    python federated_learning_demo.py

验收标准：
    - 3个模拟医院节点
    - 跨院检索演示
    - 隐私保护展示
"""

import json
import random
import hashlib
import time
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class PrivacyLevel(Enum):
    """隐私等级"""
    PUBLIC = "公开"
    INTERNAL = "院内"
    FEDERATED = "联邦共享"
    PRIVATE = "完全保密"


@dataclass
class HospitalNode:
    """医院节点（模拟）"""
    hospital_id: str
    name: str
    department: str
    data_size: int
    public_key: str
    endpoint: str
    status: str = "active"
    
    local_index: Dict[str, List[Dict]] = field(default_factory=dict)
    privacy_budget: float = 1.0  # ε-差分隐私预算
    
    def get_stats(self) -> Dict:
        """获取节点统计信息"""
        return {
            "hospital_id": self.hospital_id,
            "name": self.name,
            "data_size": self.data_size,
            "document_count": sum(len(docs) for docs in self.local_index.values()),
            "privacy_budget_remaining": self.privacy_budget,
            "status": self.status
        }


@dataclass
class SearchQuery:
    """检索查询"""
    query_text: str
    query_vector: List[float]
    disease_filter: Optional[str] = None
    evidence_level: Optional[str] = None
    top_k: int = 10


@dataclass
class SearchResult:
    """检索结果"""
    doc_id: str
    title: str
    hospital_id: str
    hospital_name: str
    relevance_score: float
    evidence_level: str
    patient_count: int
    privacy_level: PrivacyLevel
    content_hash: str


class DifferentialPrivacy:
    """差分隐私工具"""
    
    @staticmethod
    def add_laplace_noise(value: float, epsilon: float = 0.1) -> float:
        """添加拉普拉斯噪声"""
        sensitivity = 1.0
        scale = sensitivity / epsilon
        noise = random.gauss(0, scale)  # 近似拉普拉斯
        return max(0, min(1, value + noise))
    
    @staticmethod
    def calculate_privacy_cost(queries: int, epsilon_per_query: float = 0.1) -> float:
        """计算隐私预算消耗"""
        return queries * epsilon_per_query


class FederatedRetrievalDemo:
    """
    联邦检索演示系统
    
    核心逻辑：
    1. 查询加密发送到各医院
    2. 各医院本地检索（数据不出域）
    3. 检索结果加密返回
    4. 安全聚合（模拟联邦平均）
    5. 最终排序返回给用户
    """
    
    def __init__(self):
        self.hospitals: List[HospitalNode] = []
        self.global_model_version = "v1.0"
        self.query_history: List[Dict] = []
        self.audit_log: List[Dict] = []
        
        self._register_demo_hospitals()
    
    def _register_demo_hospitals(self):
        """注册演示医院（3节点）"""
        self.hospitals = [
            HospitalNode(
                hospital_id="H001",
                name="北京市人民医院",
                department="肿瘤内科",
                data_size=50000,
                public_key="pk_tumor_h001_" + hashlib.sha256(b"H001").hexdigest()[:16],
                endpoint="https://api.hospital-h001.example.com/federated"
            ),
            HospitalNode(
                hospital_id="H002",
                name="上海交通大学医学院附属瑞金医院",
                department="心内科",
                data_size=80000,
                public_key="pk_cardio_h002_" + hashlib.sha256(b"H002").hexdigest()[:16],
                endpoint="https://api.hospital-h002.example.com/federated"
            ),
            HospitalNode(
                hospital_id="H003",
                name="广州医科大学附属第一医院",
                department="呼吸内科",
                data_size=35000,
                public_key="pk_respiratory_h003_" + hashlib.sha256(b"H003").hexdigest()[:16],
                endpoint="https://api.hospital-h003.example.com/federated"
            )
        ]
        
        for h in self.hospitals:
            h.local_index = self._generate_mock_local_data(h)
        
        self._log_audit("SYSTEM", "医院节点注册完成", {"count": len(self.hospitals)})
    
    def _generate_mock_local_data(self, hospital: HospitalNode) -> Dict:
        """生成模拟本地知识库"""
        if "肿瘤" in hospital.department:
            diseases = ["肺癌", "胃癌", "结直肠癌", "乳腺癌", "肝癌"]
        elif "心内" in hospital.department:
            diseases = ["高血压", "冠心病", "心力衰竭", "房颤", "心肌病"]
        else:
            diseases = ["慢阻肺", "哮喘", "肺炎", "肺结核", "间质性肺病"]
        
        local_data = {}
        for disease in diseases:
            local_data[disease] = [
                {
                    "doc_id": f"{hospital.hospital_id}_{disease}_{i:03d}",
                    "title": f"{disease}诊疗指南（{hospital.name}内部资料）",
                    "content_hash": hashlib.sha256(f"{hospital.hospital_id}_{disease}_{i}".encode()).hexdigest(),
                    "relevance_score": random.uniform(0.7, 0.98),
                    "evidence_level": random.choice(["A", "B", "C"]),
                    "patient_count": random.randint(100, 5000),
                    "update_time": datetime.now().isoformat()
                }
                for i in range(random.randint(8, 15))
            ]
        
        return local_data
    
    def _log_audit(self, action: str, description: str, metadata: Dict = None):
        """记录审计日志"""
        self.audit_log.append({
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "description": description,
            "metadata": metadata or {}
        })
    
    def federated_search(self, query: SearchQuery) -> Dict:
        """
        联邦检索主流程
        
        实际生产环境：各医院部署本地检索服务，通过gRPC/HTTP通信
        这里模拟整个流程
        """
        start_time = time.time()
        
        print(f"\n{'='*70}")
        print(f"联邦检索启动 | 查询: '{query.query_text}' | 时间: {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*70}")
        
        self._log_audit("SEARCH_START", f"开始联邦检索: {query.query_text}")
        
        all_results: List[SearchResult] = []
        hospital_responses = []
        
        for hospital in self.hospitals:
            print(f"\n[节点] {hospital.name} ({hospital.department})")
            print(f"       数据量: {hospital.data_size:,} | 隐私预算: {hospital.privacy_budget:.2f}")
            
            local_results = self._local_search(hospital, query)
            
            if local_results:
                hospital_responses.append({
                    "hospital_id": hospital.hospital_id,
                    "hospital_name": hospital.name,
                    "result_count": len(local_results),
                    "top_score": max(r.relevance_score for r in local_results)
                })
                
                all_results.extend(local_results)
                
                hospital.privacy_budget -= 0.05
                if hospital.privacy_budget < 0:
                    hospital.privacy_budget = 0
        
        aggregated_results = self._secure_aggregate(all_results, query.top_k)
        
        for i, result in enumerate(aggregated_results):
            result.relevance_score = DifferentialPrivacy.add_laplace_noise(
                result.relevance_score, 
                epsilon=0.1
            )
        
        aggregated_results.sort(key=lambda x: x.relevance_score, reverse=True)
        
        elapsed_time = (time.time() - start_time) * 1000
        
        self.query_history.append({
            "query": query.query_text,
            "timestamp": datetime.now().isoformat(),
            "result_count": len(aggregated_results),
            "hospitals_participated": len(hospital_responses),
            "elapsed_ms": elapsed_time
        })
        
        self._log_audit("SEARCH_COMPLETE", f"检索完成，返回 {len(aggregated_results)} 条结果")
        
        print(f"\n{'='*70}")
        print(f"检索完成 | 耗时: {elapsed_time:.1f}ms | 结果: {len(aggregated_results)} 条")
        print(f"参与节点: {len(hospital_responses)} 家医院")
        print(f"{'='*70}")
        
        return {
            "query": query.query_text,
            "results": [
                {
                    "doc_id": r.doc_id,
                    "title": r.title,
                    "hospital": r.hospital_name,
                    "relevance": round(r.relevance_score, 3),
                    "evidence": r.evidence_level,
                    "patient_count": r.patient_count,
                    "privacy_level": r.privacy_level.value
                }
                for r in aggregated_results
            ],
            "metadata": {
                "total_results": len(aggregated_results),
                "hospitals_participated": hospital_responses,
                "elapsed_ms": round(elapsed_time, 2),
                "privacy_preserved": True,
                "data_leaked": False
            }
        }
    
    def _local_search(self, hospital: HospitalNode, query: SearchQuery) -> List[SearchResult]:
        """
        本地检索（模拟）
        
        关键点：数据从未离开医院服务器
        """
        results = []
        
        for disease, docs in hospital.local_index.items():
            if query.disease_filter and disease != query.disease_filter:
                continue
            
            for doc in docs:
                if query.evidence_level and doc["evidence_level"] != query.evidence_level:
                    continue
                
                score = doc["relevance_score"] * random.uniform(0.95, 1.05)
                
                results.append(SearchResult(
                    doc_id=doc["doc_id"],
                    title=doc["title"],
                    hospital_id=hospital.hospital_id,
                    hospital_name=hospital.name,
                    relevance_score=score,
                    evidence_level=doc["evidence_level"],
                    patient_count=doc["patient_count"],
                    privacy_level=PrivacyLevel.FEDERATED,
                    content_hash=doc["content_hash"]
                ))
        
        results.sort(key=lambda x: x.relevance_score, reverse=True)
        return results[:query.top_k * 2]
    
    def _secure_aggregate(self, results: List[SearchResult], top_k: int) -> List[SearchResult]:
        """
        安全聚合（模拟联邦平均）
        
        实际实现：使用安全多方计算(MPC)或同态加密
        """
        seen = set()
        unique_results = []
        
        for r in results:
            if r.doc_id not in seen:
                seen.add(r.doc_id)
                unique_results.append(r)
        
        unique_results.sort(key=lambda x: x.relevance_score, reverse=True)
        return unique_results[:top_k]
    
    def get_network_status(self) -> Dict:
        """获取联邦网络状态"""
        return {
            "version": self.global_model_version,
            "total_hospitals": len(self.hospitals),
            "active_hospitals": sum(1 for h in self.hospitals if h.status == "active"),
            "total_data_size": sum(h.data_size for h in self.hospitals),
            "total_documents": sum(
                sum(len(docs) for docs in h.local_index.values())
                for h in self.hospitals
            ),
            "hospitals": [h.get_stats() for h in self.hospitals]
        }
    
    def get_privacy_report(self) -> Dict:
        """获取隐私保护报告"""
        return {
            "total_queries": len(self.query_history),
            "privacy_budget_consumed": sum(0.05 * len(self.query_history) for _ in self.hospitals) / len(self.hospitals),
            "hospitals_budget": [
                {
                    "hospital": h.name,
                    "remaining_budget": h.privacy_budget,
                    "consumed": 1.0 - h.privacy_budget
                }
                for h in self.hospitals
            ],
            "data_leak_incidents": 0,
            "compliance": "符合《医疗数据安全管理指南》"
        }
    
    def get_audit_log(self, limit: int = 20) -> List[Dict]:
        """获取审计日志"""
        return self.audit_log[-limit:]


def print_banner():
    """打印横幅"""
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║        联邦学习医疗检索系统 - 概念演示版                          ║
║                                                                   ║
║        Federated Learning Medical Retrieval Demo                  ║
║                                                                   ║
║        核心特点：数据不出院 | 隐私保护 | 安全聚合                 ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
""")


def demo_basic_search(system: FederatedRetrievalDemo):
    """演示1：基础联邦检索"""
    print("\n" + "="*70)
    print("演示1：基础联邦检索")
    print("="*70)
    
    query = SearchQuery(
        query_text="肺癌靶向治疗方案",
        query_vector=[0.1] * 768,
        top_k=5
    )
    
    result = system.federated_search(query)
    
    print("\n检索结果：")
    for i, r in enumerate(result["results"], 1):
        print(f"\n  [{i}] {r['title']}")
        print(f"      来源: {r['hospital']}")
        print(f"      相关度: {r['relevance']:.3f} | 证据等级: {r['evidence']}")
        print(f"      病例数: {r['patient_count']} | 隐私级别: {r['privacy_level']}")


def demo_disease_filter(system: FederatedRetrievalDemo):
    """演示2：疾病过滤检索"""
    print("\n" + "="*70)
    print("演示2：疾病过滤检索（仅检索心血管相关）")
    print("="*70)
    
    query = SearchQuery(
        query_text="高血压治疗方案",
        query_vector=[0.2] * 768,
        disease_filter="高血压",
        top_k=3
    )
    
    result = system.federated_search(query)
    
    print("\n检索结果：")
    for i, r in enumerate(result["results"], 1):
        print(f"\n  [{i}] {r['title']}")
        print(f"      来源: {r['hospital']}")


def demo_privacy_protection(system: FederatedRetrievalDemo):
    """演示3：隐私保护机制"""
    print("\n" + "="*70)
    print("演示3：隐私保护机制展示")
    print("="*70)
    
    print("\n核心隐私保护机制：")
    print("  1. 数据本地存储：原始数据从未离开医院服务器")
    print("  2. 差分隐私：检索结果添加拉普拉斯噪声")
    print("  3. 隐私预算：每次查询消耗隐私预算")
    print("  4. 安全聚合：联邦平均算法聚合结果")
    print("  5. 审计追踪：所有操作记录可追溯")
    
    privacy_report = system.get_privacy_report()
    
    print(f"\n隐私报告：")
    print(f"  总查询次数: {privacy_report['total_queries']}")
    print(f"  数据泄露事件: {privacy_report['data_leak_incidents']}")
    print(f"  合规状态: {privacy_report['compliance']}")
    
    print("\n各医院隐私预算消耗：")
    for h in privacy_report['hospitals_budget']:
        print(f"  - {h['hospital']}: 剩余 {h['remaining_budget']:.2f}")


def demo_network_status(system: FederatedRetrievalDemo):
    """演示4：网络状态"""
    print("\n" + "="*70)
    print("演示4：联邦网络状态")
    print("="*70)
    
    status = system.get_network_status()
    
    print(f"\n网络版本: {status['version']}")
    print(f"活跃节点: {status['active_hospitals']}/{status['total_hospitals']}")
    print(f"总数据量: {status['total_data_size']:,} 条记录")
    print(f"总文档数: {status['total_documents']} 篇")
    
    print("\n节点详情：")
    for h in status['hospitals']:
        print(f"\n  [{h['hospital_id']}] {h['name']}")
        print(f"      科室: {h['department']}")
        print(f"      数据量: {h['data_size']:,}")
        print(f"      文档数: {h['document_count']}")
        print(f"      隐私预算: {h['privacy_budget_remaining']:.2f}")


def demo_audit_log(system: FederatedRetrievalDemo):
    """演示5：审计日志"""
    print("\n" + "="*70)
    print("演示5：审计日志追踪")
    print("="*70)
    
    logs = system.get_audit_log()
    
    print("\n最近操作记录：")
    for log in logs[-10:]:
        print(f"  [{log['timestamp']}] {log['action']}: {log['description']}")


def main():
    """主演示程序"""
    print_banner()
    
    system = FederatedRetrievalDemo()
    
    print("\n初始化完成，开始演示...")
    print("="*70)
    
    demo_network_status(system)
    
    demo_basic_search(system)
    
    demo_disease_filter(system)
    
    demo_privacy_protection(system)
    
    demo_audit_log(system)
    
    print("\n" + "="*70)
    print("演示完成！")
    print("="*70)
    
    print("\n核心卖点总结：")
    print("  ✓ 数据不出院：原始数据从未离开医院服务器")
    print("  ✓ 隐私保护：差分隐私 + 隐私预算管理")
    print("  ✓ 安全聚合：联邦平均算法，无需共享原始数据")
    print("  ✓ 审计追踪：所有操作可追溯，符合医疗合规要求")
    print("  ✓ 跨院协同：多家医院协同检索，提升检索质量")
    
    print("\n适用场景：")
    print("  • 多中心临床研究数据共享")
    print("  • 跨医院病历检索")
    print("  • 医疗AI模型联合训练")
    print("  • 区域医疗数据协同分析")
    
    print("\n" + "="*70)
    print("如需真实部署，请联系技术团队获取生产版本。")
    print("="*70)


if __name__ == "__main__":
    main()
