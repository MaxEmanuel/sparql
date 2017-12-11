FROM ubuntu:16.04
MAINTAINER Maximilian Schuele <m.schuele@tum.de>

RUN apt-get update

# Install node and some tools
RUN apt-get update && apt-get install -y git nodejs npm tmux unzip wget htop && \
        ln -s /usr/bin/nodejs /usr/bin/node
# Install src and modules
COPY ./views /src/views/
COPY bower.json package.json Makefile /src/
RUN cd /src && make install
COPY ./src /src/src/
COPY ./opt /opt/
COPY config.json startup.sh server.js /src/
RUN cd /src && make install all

# Run rest as non root user
RUN useradd -ms /bin/bash dockeruser
USER dockeruser
WORKDIR /home/dockeruser

# Run
EXPOSE 8080
ENV TERM=xterm
CMD ["/src/startup.sh"]
