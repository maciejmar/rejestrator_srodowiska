-- ============================================================
--  Portal AI – BGK  |  Schemat bazy danych
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_models (
    id                   VARCHAR(50)  PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL,
    description          TEXT,
    type                 VARCHAR(20),
    parameters           VARCHAR(20),
    status               VARCHAR(20)  NOT NULL DEFAULT 'available',
    max_concurrent_users INTEGER      NOT NULL DEFAULT 4,
    context_window       VARCHAR(20),
    vendor               VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS reservations (
    id          VARCHAR(50)  PRIMARY KEY,
    model_id    VARCHAR(50)  NOT NULL REFERENCES ai_models(id),
    user_email  VARCHAR(255) NOT NULL,
    user_name   VARCHAR(200) NOT NULL,
    department  VARCHAR(200) NOT NULL,
    date        DATE         NOT NULL,
    is_full_day BOOLEAN      NOT NULL DEFAULT FALSE,
    start_time  TIME,
    end_time    TIME,
    purpose     TEXT         NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'confirmed',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_res_model_date ON reservations (model_id, date);
CREATE INDEX IF NOT EXISTS idx_res_date       ON reservations (date);
CREATE INDEX IF NOT EXISTS idx_res_status     ON reservations (status);

-- ── Dane początkowe – modele ──────────────────────────────────────────────
INSERT INTO ai_models VALUES
  ('llama3-70b',       'Llama 3 70B',       'Flagowy model Meta do analizy dokumentów i zadań NLP.',              'LLM',       '70B',   'available',   4, '128k', 'Meta'),
  ('llama3-8b',        'Llama 3 8B',        'Szybki model Meta do prostych zadań NLP i klasyfikacji.',            'LLM',       '8B',    'available',  12, '128k', 'Meta'),
  ('mistral-7b',       'Mistral 7B',        'Efektywny model Mistral z doskonałą jakością do rozmiaru.',          'LLM',       '7B',    'available',  12,  '32k', 'Mistral AI'),
  ('mixtral-8x7b',     'Mixtral 8×7B',      'Model Mixture-of-Experts od Mistral AI.',                            'LLM',       '8×7B',  'available',   4,  '32k', 'Mistral AI'),
  ('codellama-34b',    'CodeLlama 34B',     'Wyspecjalizowany model do generowania i analizy kodu.',              'Code',      '34B',   'busy',        3, '100k', 'Meta'),
  ('deepseek-coder-33b','DeepSeek Coder 33B','Zaawansowany model do kodowania z szeroką obsługą języków.',        'Code',      '33B',   'available',   3,  '16k', 'DeepSeek'),
  ('nomic-embed-text', 'Nomic Embed Text',  'Model embedingów do semantycznego wyszukiwania dokumentów.',         'Embedding', '137M',  'available',  32,   NULL, 'Nomic'),
  ('llava-13b',        'LLaVA 13B',         'Model multimodalny do analizy obrazów i dokumentów.',                'Multimodal','13B',   'maintenance', 2,   '4k', 'Haotian Liu')
ON CONFLICT (id) DO NOTHING;
