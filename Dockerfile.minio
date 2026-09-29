FROM quay.io/minio/minio:latest

VOLUME /data
EXPOSE 9000 9001

CMD ["server", "/data", "--console-address", ":9001"]
