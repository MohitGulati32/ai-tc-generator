import os
import sys
import logging
import warnings
warnings.filterwarnings("ignore")

# Suppress all logging output to stdout
logging.disable(logging.CRITICAL)
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import json
from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.postprocessor import MetadataReplacementPostProcessor
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5"
)
Settings.llm = None

def retrieve(user_story: str, top_k: int = 5) -> str:
    storage_context = StorageContext.from_defaults(
        persist_dir="data/vector_store"
    )
    index = load_index_from_storage(storage_context)

    postprocessor = MetadataReplacementPostProcessor(
        target_metadata_key="window"
    )

    retriever = index.as_retriever(similarity_top_k=top_k)
    nodes = retriever.retrieve(user_story)
    nodes = postprocessor.postprocess_nodes(nodes)

    results = [node.get_content() for node in nodes]
    return json.dumps(results)

if __name__ == "__main__":
    user_story = sys.argv[1] if len(sys.argv) > 1 else ""
    # Write only JSON to stdout, nothing else
    sys.stdout.write(retrieve(user_story))