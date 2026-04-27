FROM repo.bank.com.pl/zrai-docker-remote-dev/python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN --mount=type=secret,id=pip_conf,dst=/etc/pip.conf \
    --mount=type=secret,id=ca_cert,dst=/usr/local/share/ca-certificates/bank-jfrog-ca.crt \
    update-ca-certificates && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
