#!/usr/bin/env python3
"""
PubMed医学文献自动下载脚本
目标：3000篇核心文献
"""

import asyncio
import json
import os
import re
import time
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import xml.etree.ElementTree as ET

try:
    from Bio import Entrez
    ENTREZ_AVAILABLE = True
except ImportError:
    ENTREZ_AVAILABLE = False
    print("Warning: Biopython not installed. Install with: pip install biopython")


@dataclass
class PubMedArticle:
    pmid: str
    title: str
    abstract: str
    keywords: List[str]
    authors: List[str]
    journal: str
    publication_date: str
    doi: Optional[str]
    disease: str
    evidence_level: str
    source: str = "PubMed"


class MedicalDataCollector:
    """PubMed医学文献采集器"""
    
    COMMON_DISEASES = [
        "lung cancer", "breast cancer", "colorectal cancer", "gastric cancer",
        "liver cancer", "prostate cancer", "pancreatic cancer", "ovarian cancer",
        "hypertension", "diabetes mellitus", "coronary heart disease", "heart failure",
        "stroke", "chronic kidney disease", "COPD", "asthma", "pneumonia",
        "tuberculosis", "hepatitis B", "hepatitis C", "HIV", "COVID-19",
        "influenza", "pneumonia", "bronchitis", "emphysema",
        "rheumatoid arthritis", "osteoarthritis", "gout", "lupus",
        "depression", "anxiety", "schizophrenia", "bipolar disorder",
        "Alzheimer disease", "Parkinson disease", "epilepsy", "migraine",
        "gastritis", "peptic ulcer", "inflammatory bowel disease", "cirrhosis",
        "hyperlipidemia", "atherosclerosis", "arrhythmia", "cardiomyopathy",
        "thyroid nodule", "hyperthyroidism", "hypothyroidism", "thyroid cancer",
        "anemia", "leukemia", "lymphoma", "multiple myeloma",
        "chronic pain", "fibromyalgia", "chronic fatigue syndrome",
        "obesity", "metabolic syndrome", "fatty liver disease",
        "urinary tract infection", "kidney stones", "prostatitis",
        "menstrual disorders", "polycystic ovary syndrome", "endometriosis",
        "cataract", "glaucoma", "macular degeneration", "diabetic retinopathy",
        "hearing loss", "tinnitus", "sinusitis", "allergic rhinitis"
    ]
    
    EVIDENCE_KEYWORDS = {
        "1a": ["meta-analysis", "systematic review"],
        "1b": ["randomized controlled trial", "rct"],
        "2a": ["cohort study", "prospective study"],
        "2b": ["case-control study", "retrospective study"],
        "3a": ["case series", "case report"],
        "4": ["expert opinion", "consensus", "guideline"],
        "5": ["review", "narrative review"]
    }
    
    def __init__(self, email: str = "your@email.com", api_key: Optional[str] = None):
        if not ENTREZ_AVAILABLE:
            raise ImportError("Biopython is required. Install with: pip install biopython")
        
        Entrez.email = email
        if api_key:
            Entrez.api_key = api_key
        
        self.output_dir = "data/pubmed"
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.articles: List[PubMedArticle] = []
        self.stats = {
            "total_collected": 0,
            "by_disease": {},
            "by_evidence_level": {},
            "errors": []
        }
    
    def classify_evidence(self, article_data: Dict) -> str:
        """分类证据等级"""
        title = article_data.get("title", "").lower()
        abstract = article_data.get("abstract", "").lower()
        text = f"{title} {abstract}"
        
        for level, keywords in self.EVIDENCE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    return level
        
        return "5"
    
    def parse_pubmed_article(self, article_xml) -> Optional[Dict]:
        """解析PubMed文章XML"""
        try:
            medline = article_xml.find("MedlineCitation")
            if medline is None:
                return None
            
            article = medline.find("Article")
            if article is None:
                return None
            
            title_elem = article.find("ArticleTitle")
            title = title_elem.text if title_elem is not None and title_elem.text else ""
            
            abstract_elem = article.find("Abstract")
            abstract = ""
            if abstract_elem is not None:
                abstract_texts = abstract_elem.findall("AbstractText")
                abstract_parts = []
                for at in abstract_texts:
                    label = at.get("Label", "")
                    text = "".join(at.itertext())
                    if label:
                        abstract_parts.append(f"{label}: {text}")
                    else:
                        abstract_parts.append(text)
                abstract = " ".join(abstract_parts)
            
            keywords = []
            keyword_list = medline.find("KeywordList")
            if keyword_list is not None:
                for kw in keyword_list.findall("Keyword"):
                    if kw.text:
                        keywords.append(kw.text)
            
            authors = []
            author_list = article.find("AuthorList")
            if author_list is not None:
                for author in author_list.findall("Author"):
                    lastname = author.find("LastName")
                    forename = author.find("ForeName")
                    if lastname is not None and lastname.text:
                        name = lastname.text
                        if forename is not None and forename.text:
                            name = f"{lastname.text} {forename.text}"
                        authors.append(name)
            
            journal_elem = article.find("Journal")
            journal = ""
            if journal_elem is not None:
                title_elem = journal_elem.find("Title")
                if title_elem is not None and title_elem.text:
                    journal = title_elem.text
            
            pub_date = ""
            pub_date_elem = article.find("Journal/JournalIssue/PubDate")
            if pub_date_elem is not None:
                year = pub_date_elem.find("Year")
                if year is not None and year.text:
                    pub_date = year.text
            
            pmid_elem = medline.find("PMID")
            pmid = pmid_elem.text if pmid_elem is not None and pmid_elem.text else ""
            
            doi = ""
            eloc_list = article.findall("ELocationID")
            for eloc in eloc_list:
                if eloc.get("EIdType") == "doi" and eloc.text:
                    doi = eloc.text
            
            return {
                "pmid": pmid,
                "title": title,
                "abstract": abstract,
                "keywords": keywords,
                "authors": authors,
                "journal": journal,
                "publication_date": pub_date,
                "doi": doi
            }
        except Exception as e:
            print(f"Error parsing article: {e}")
            return None
    
    async def search_pubmed(self, disease: str, max_results: int = 100) -> List[str]:
        """搜索PubMed获取PMID列表"""
        query = f'({disease}[Title/Abstract]) AND (guideline[Title] OR consensus[Title] OR review[Title/Abstract] OR trial[Title/Abstract]) AND ("2020"[Date - Publication] : "3000"[Date - Publication])'
        
        try:
            handle = Entrez.esearch(
                db="pubmed",
                term=query,
                retmax=max_results,
                sort="relevance",
                datetype="pdat"
            )
            record = Entrez.read(handle)
            handle.close()
            
            pmids = record.get("IdList", [])
            print(f"Found {len(pmids)} articles for: {disease}")
            return pmids
        except Exception as e:
            print(f"Error searching PubMed for {disease}: {e}")
            self.stats["errors"].append(f"Search error for {disease}: {str(e)}")
            return []
    
    async def fetch_articles(self, pmids: List[str], disease: str) -> List[PubMedArticle]:
        """批量获取文章详情"""
        if not pmids:
            return []
        
        articles = []
        batch_size = 100
        
        for i in range(0, len(pmids), batch_size):
            batch = pmids[i:i + batch_size]
            
            try:
                handle = Entrez.efetch(
                    db="pubmed",
                    id=",".join(batch),
                    rettype="xml",
                    retmode="xml"
                )
                xml_data = handle.read()
                handle.close()
                
                root = ET.fromstring(xml_data)
                
                for article_xml in root.findall(".//PubmedArticle"):
                    article_data = self.parse_pubmed_article(article_xml)
                    
                    if article_data and article_data["title"] and article_data["abstract"]:
                        evidence_level = self.classify_evidence(article_data)
                        
                        article = PubMedArticle(
                            pmid=article_data["pmid"],
                            title=article_data["title"],
                            abstract=article_data["abstract"],
                            keywords=article_data["keywords"],
                            authors=article_data["authors"],
                            journal=article_data["journal"],
                            publication_date=article_data["publication_date"],
                            doi=article_data["doi"],
                            disease=disease,
                            evidence_level=evidence_level
                        )
                        articles.append(article)
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Error fetching batch {i//batch_size}: {e}")
                self.stats["errors"].append(f"Fetch error: {str(e)}")
        
        return articles
    
    async def collect_disease(self, disease: str, max_results: int = 60) -> List[PubMedArticle]:
        """采集单个疾病的文献"""
        print(f"\n{'='*50}")
        print(f"Collecting articles for: {disease}")
        print(f"{'='*50}")
        
        pmids = await self.search_pubmed(disease, max_results)
        articles = await self.fetch_articles(pmids, disease)
        
        self.stats["by_disease"][disease] = len(articles)
        for article in articles:
            level = article.evidence_level
            self.stats["by_evidence_level"][level] = self.stats["by_evidence_level"].get(level, 0) + 1
        
        print(f"Collected {len(articles)} articles for {disease}")
        return articles
    
    async def batch_collect(self, max_per_disease: int = 60, top_diseases: int = 50) -> List[PubMedArticle]:
        """批量采集Top疾病文献"""
        print(f"\nStarting batch collection...")
        print(f"Target: {top_diseases} diseases, {max_per_disease} articles each")
        
        all_articles = []
        diseases = self.COMMON_DISEASES[:top_diseases]
        
        for i, disease in enumerate(diseases):
            print(f"\nProgress: {i+1}/{len(diseases)}")
            
            articles = await self.collect_disease(disease, max_per_disease)
            all_articles.extend(articles)
            
            self.stats["total_collected"] = len(all_articles)
            
            if (i + 1) % 5 == 0:
                self._save_progress(all_articles)
                print(f"\nCheckpoint saved. Total: {len(all_articles)} articles")
            
            time.sleep(1)
        
        self.articles = all_articles
        return all_articles
    
    def _save_progress(self, articles: List[PubMedArticle]):
        """保存进度"""
        data = [asdict(a) for a in articles]
        
        filename = f"{self.output_dir}/pubmed_articles_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        stats_file = f"{self.output_dir}/collection_stats.json"
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(self.stats, f, ensure_ascii=False, indent=2)
    
    def save_results(self, articles: List[PubMedArticle]):
        """保存最终结果"""
        self._save_progress(articles)
        
        final_file = f"{self.output_dir}/pubmed_articles_final.json"
        data = [asdict(a) for a in articles]
        with open(final_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n{'='*50}")
        print("Collection Complete!")
        print(f"{'='*50}")
        print(f"Total articles: {len(articles)}")
        print(f"Output file: {final_file}")
        print(f"\nBy Evidence Level:")
        for level, count in sorted(self.stats["by_evidence_level"].items()):
            print(f"  Level {level}: {count}")
        print(f"\nTop 10 Diseases by Article Count:")
        sorted_diseases = sorted(self.stats["by_disease"].items(), key=lambda x: x[1], reverse=True)
        for disease, count in sorted_diseases[:10]:
            print(f"  {disease}: {count}")


async def main():
    collector = MedicalDataCollector(
        email=os.getenv("ENTREZ_EMAIL", "your@email.com"),
        api_key=os.getenv("ENTREZ_API_KEY")
    )
    
    articles = await collector.batch_collect(
        max_per_disease=60,
        top_diseases=50
    )
    
    collector.save_results(articles)


if __name__ == "__main__":
    asyncio.run(main())
