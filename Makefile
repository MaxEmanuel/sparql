JS_FILES=server.js $(patsubst src/%.coffee,public/%.js,$(wildcard src/*.coffee src/**/*.coffee src/*/*/*.coffee))
JADE_FILES=public/index.html

all: $(JS_FILES) $(HANDLEBARS_FILES) $(JADE_FILES) rdf3x

rdf3x:
	(cd /opt/rdf3x; make)

public/%.html: views/%.jade $(wildcard views/*.jade views/*/*.jade)
	@mkdir -p $(dir $@)
	./node_modules/jade/bin/jade.js -o $(dir $@) $<

public/%.js: src/%.coffee
	@mkdir -p $(dir $@)
	./node_modules/coffee-script/bin/coffee --output $(dir $@) --compile --map $<

%.js: %.coffee
	@mkdir -p $(dir $@)
	./node_modules/coffee-script/bin/coffee --map --compile $<

public/%.handlebars: views/%.handlebars
	@mkdir -p $(dir $@)
	cp $< $@

install:
	npm install
	./node_modules/bower/bin/bower --allow-root install
	cd bower_components/bootstrap && npm install && make && make bootstrap

run: all
	@kill `cat server.pid`; true
	@node server & echo $$! > server.pid

stats:
	cloc --exclude-dir=public,old,data,node_modules --force-lang=html,jade .

nodemon:
	./node_modules/nodemon/nodemon.js --watch . --ext js,jade,coffee,handlebars --exec 'make run' .

.PHONY: clean install all run nodemon stats rdf3x
