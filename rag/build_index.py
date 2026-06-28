from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.node_parser import SentenceWindowNodeParser
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Free embedding model, no OpenAI needed
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5"
)

# Disable default LLM (we use Anthropic separately)
Settings.llm = None

# Sentence window node parser - Course 1 technique
node_parser = SentenceWindowNodeParser.from_defaults(
    window_size=3,
    window_metadata_key="window",
    original_text_metadata_key="original_text"
)

print("Loading documents...")
documents = SimpleDirectoryReader("data/sample_test_cases").load_data()

print("Building index with sentence window...")
index = VectorStoreIndex.from_documents(
    documents,
    transformations=[node_parser]
)

index.storage_context.persist("data/vector_store")
print("Index saved to data/vector_store")