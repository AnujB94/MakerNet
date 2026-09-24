CREATE TABLE makernet.email_sign_in_token (
  token_hash char(64) PRIMARY KEY,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254 AND email = lower(email)),
  return_to text NOT NULL DEFAULT '/',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX email_sign_in_rate_limit
  ON makernet.email_sign_in_token(email, created_at DESC);
