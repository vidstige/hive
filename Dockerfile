FROM python:3.6-alpine
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
ENV FLASK_APP server.py
ENV FLASK_ENV=production
EXPOSE 8000
CMD ["flask", "run", "--host=0.0.0.0", "--port=8000"]
