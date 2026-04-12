#!/usr/bin/env python3
"""
数据采集主脚本
运行所有数据采集任务
"""

import asyncio
import os
import sys
import json
from datetime import datetime
from typing import Dict, List

sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def run_pubmed_collection():
    """运行PubMed文献采集"""
    print("\n" + "="*60)
    print("Step 1: PubMed Literature Collection")
    print("="*60)
    
    try:
        from pubmed_collector import MedicalDataCollector
        
        collector = MedicalDataCollector(
            email=os.getenv("ENTREZ_EMAIL", "your@email.com"),
            api_key=os.getenv("ENTREZ_API_KEY")
        )
        
        articles = await collector.batch_collect(
            max_per_disease=240,
            top_diseases=50
        )
        
        collector.save_results(articles)
        return {"success": True, "count": len(articles)}
    except ImportError as e:
        print(f"Warning: Biopython not installed. Skipping PubMed collection.")
        print(f"Install with: pip install biopython")
        return {"success": False, "error": str(e)}
    except Exception as e:
        print(f"Error in PubMed collection: {e}")
        return {"success": False, "error": str(e)}


def run_tcm_collection():
    """运行中医药知识库采集"""
    print("\n" + "="*60)
    print("Step 2: TCM Knowledge Base Collection")
    print("="*60)
    
    try:
        from tcm_collector import TCMDataCollector
        
        collector = TCMDataCollector()
        data = collector.collect_all()
        collector.save_results(data)
        
        return {"success": True, "count": data["stats"]["total"]}
    except Exception as e:
        print(f"Error in TCM collection: {e}")
        return {"success": False, "error": str(e)}


def run_guideline_collection():
    """运行临床指南采集"""
    print("\n" + "="*60)
    print("Step 3: Clinical Guideline Collection")
    print("="*60)
    
    try:
        from guideline_collector import GuidelineCollector
        
        collector = GuidelineCollector()
        data = collector.collect_all()
        collector.save_results(data)
        
        return {"success": True, "count": data["stats"]["total"]}
    except Exception as e:
        print(f"Error in guideline collection: {e}")
        return {"success": False, "error": str(e)}


def run_ner_pipeline(documents: List[Dict] = None):
    """运行医学NER流水线"""
    print("\n" + "="*60)
    print("Step 4: Medical NER Pipeline")
    print("="*60)
    
    try:
        from medical_ner_pipeline import MedicalNLPipeline
        
        pipeline = MedicalNLPipeline()
        
        if documents is None:
            documents = [
                {
                    "id": "SAMPLE_001",
                    "text": "高血压患者常出现头痛、头晕等症状。治疗高血压可使用阿司匹林、氯吡格雷等药物。",
                    "source": "sample"
                }
            ]
        
        results = pipeline.process_batch(documents)
        pipeline.save_results(results)
        
        return {
            "success": True,
            "doc_count": len(results),
            "entity_count": pipeline.stats["total_entities"],
            "relation_count": pipeline.stats["total_relations"]
        }
    except Exception as e:
        print(f"Error in NER pipeline: {e}")
        return {"success": False, "error": str(e)}


def generate_collection_report(results: Dict):
    """生成采集报告"""
    print("\n" + "="*60)
    print("Data Collection Report")
    print("="*60)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "results": results,
        "summary": {
            "total_sources": len([r for r in results.values() if r.get("success")]),
            "failed_sources": len([r for r in results.values() if not r.get("success")])
        }
    }
    
    print(f"\nTimestamp: {report['timestamp']}")
    print(f"\nResults:")
    for source, result in results.items():
        status = "✓" if result.get("success") else "✗"
        count = result.get("count", result.get("doc_count", "N/A"))
        print(f"  {status} {source}: {count}")
    
    print(f"\nSummary:")
    print(f"  Successful: {report['summary']['total_sources']}")
    print(f"  Failed: {report['summary']['failed_sources']}")
    
    report_file = f"data/collection_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    os.makedirs("data", exist_ok=True)
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\nReport saved to: {report_file}")
    
    return report


async def main():
    """主函数"""
    print("\n" + "="*60)
    print("AI Health Assistant - Data Collection Pipeline")
    print("="*60)
    print(f"Started at: {datetime.now().isoformat()}")
    
    os.makedirs("data", exist_ok=True)
    os.makedirs("data/pubmed", exist_ok=True)
    os.makedirs("data/tcm", exist_ok=True)
    os.makedirs("data/guidelines", exist_ok=True)
    os.makedirs("data/processed", exist_ok=True)
    
    results = {}
    
    results["pubmed"] = await run_pubmed_collection()
    
    results["tcm"] = run_tcm_collection()
    
    results["guidelines"] = run_guideline_collection()
    
    results["ner_pipeline"] = run_ner_pipeline()
    
    report = generate_collection_report(results)
    
    print("\n" + "="*60)
    print("Data Collection Complete!")
    print("="*60)
    
    return report


if __name__ == "__main__":
    asyncio.run(main())
