"use strict";

var caching      = {};

var dottemplates = require("./dottemplates.js"),
    pkg          = require("./../../package.json"),
    paths        = require("./paths.js").get();

var async        = require("async"),
    autoprefixer = require("autoprefixer-core"),
    cleanCSS     = new require("clean-css")({keepSpecialComments : 0}),
    crypto       = require("crypto"),
    fs           = require("graceful-fs"),
    htmlMinifier = require("html-minifier"),
    mime         = require("mime"),
    path         = require("path"),
    uglify       = require("uglify-js"),
    zlib         = require("zlib");

var doMinify,
    etag         = crypto.createHash("md5").update(String(Date.now())).digest("hex"),
    themesPath   = path.join(paths.module, "/node_modules/codemirror/theme"),
    modesPath    = path.join(paths.module, "/node_modules/codemirror/mode");

caching.files = {
        css: [
            "node_modules/codemirror/lib/codemirror.css",
            "client/style.css",
            "client/sprites.css"
        ],
        js: [
            "node_modules/jquery/dist/jquery.js",
            "client/lib/jquery.customSelect.min.js",
            "node_modules/pretty-bytes/pretty-bytes.js",
            "node_modules/codemirror/lib/codemirror.js",
            "node_modules/codemirror/addon/selection/active-line.js",
            "node_modules/codemirror/addon/selection/mark-selection.js",
            "node_modules/codemirror/addon/search/searchcursor.js",
            "node_modules/codemirror/addon/edit/matchbrackets.js",
            "node_modules/codemirror/keymap/sublime.js",
            "client/client.js"
        ],
        html: [
            "client/html/base.html",
            "client/html/auth.html",
            "client/html/main.html"
        ],
        templates: [
            "client/templates/views/directory.dotjs",
            "client/templates/views/document.dotjs",
            "client/templates/views/media.dotjs",
            "client/templates/options.dotjs"
        ],
        other: [
            "client/Roboto.woff",
            "client/images/logo.svg",
            "client/images/logo16.png",
            "client/images/logo32.png",
            "client/images/logo128.png",
            "client/images/logo152.png",
            "client/images/logo180.png",
            "client/images/logo192.png",
            "client/images/favicon.ico"
        ]
    };

// On-demand loadable libs, preferably minified. Will be available as ?!/[property value]
var libs = {
    "node_modules/video.js/dist/cdn/video.js"              : "video.js/vjs.js",
    "node_modules/video.js/dist/video-js/video-js.min.css" : "video.js/vjs.css",
    "node_modules/video.js/dist/video-js/video-js.swf"     : "video.js/vjs.swf",
    "node_modules/video.js/dist/video-js/font/vjs.eot"     : "video.js/font/vjs.eot",
    "node_modules/video.js/dist/video-js/font/vjs.svg"     : "video.js/font/vjs.svg",
    "node_modules/video.js/dist/video-js/font/vjs.ttf"     : "video.js/font/vjs.ttf",
    "node_modules/video.js/dist/video-js/font/vjs.woff"    : "video.js/font/vjs.woff"
};

// Mime list extracted from codemirror/mode/meta.js
var modesByMime = {
    "application/javascript": "javascript",
    "application/json": "javascript",
    "application/ld+json": "javascript",
    "application/sieve": "sieve",
    "application/typescript": "javascript",
    "application/x-aspx": "htmlembedded",
    "application/x-cypher-query": "cypher",
    "application/x-ejs": "htmlembedded",
    "application/x-httpd-php": "php",
    "application/x-json": "javascript",
    "application/x-jsp": "htmlembedded",
    "application/x-sparql-query": "sparql",
    "application/xml": "xml",
    "application/xml-dtd": "dtd",
    "application/xquery": "xquery",
    "message/http": "http",
    "text/apl": "apl",
    "text/css": "css",
    "text/html": "htmlmixed",
    "text/javascript": "javascript",
    "text/mirc": "mirc",
    "text/n-triples": "ntriples",
    "text/tiki": "tiki",
    "text/turtle": "turtle",
    "text/vbscript": "vbscript",
    "text/velocity": "velocity",
    "text/x-asterisk": "asterisk",
    "text/x-c++src": "clike",
    "text/x-clojure": "clojure",
    "text/x-cobol": "cobol",
    "text/x-coffeescript": "coffeescript",
    "text/x-common-lisp": "commonlisp",
    "text/x-csharp": "clike",
    "text/x-csrc": "clike",
    "text/x-cython": "python",
    "text/x-d": "d",
    "text/x-diff": "diff",
    "text/x-dockerfile": "dockerfile",
    "text/x-dylan": "dylan",
    "text/x-ecl": "ecl",
    "text/x-eiffel": "eiffel",
    "text/x-erlang": "erlang",
    "text/x-feature": "gherkin",
    "text/x-fortran": "fortran",
    "text/x-fsharp": "mllike",
    "text/x-gas": "gas",
    "text/x-gfm": "gfm",
    "text/x-go": "go",
    "text/x-groovy": "groovy",
    "text/x-haml": "haml",
    "text/x-haskell": "haskell",
    "text/x-haxe": "haxe",
    "text/x-idl": "idl",
    "text/x-jade": "jade",
    "text/x-java": "clike",
    "text/x-julia": "julia",
    "text/x-kotlin": "kotlin",
    "text/x-latex": "stex",
    "text/x-less": "css",
    "text/x-livescript": "livescript",
    "text/x-lua": "lua",
    "text/x-mariadb": "sql",
    "text/x-markdown": "markdown",
    "text/x-modelica": "modelica",
    "text/x-nginx-conf": "nginx",
    "text/x-objectivec": "clike",
    "text/x-ocaml": "mllike",
    "text/x-octave": "octave",
    "text/x-pascal": "pascal",
    "text/x-perl": "perl",
    "text/x-php": "php",
    "text/x-pig": "pig",
    "text/x-properties": "properties",
    "text/x-puppet": "puppet",
    "text/x-python": "python",
    "text/x-rsrc": "r",
    "text/x-rst": "rst",
    "text/x-ruby": "ruby",
    "text/x-rustsrc": "rust",
    "text/x-sass": "sass",
    "text/x-scala": "clike",
    "text/x-scheme": "scheme",
    "text/x-scss": "css",
    "text/x-sh": "shell",
    "text/x-slim": "slim",
    "text/x-smarty": "smarty",
    "text/x-solr": "solr",
    "text/x-sql": "sql",
    "text/x-stex": "stex",
    "text/x-stsrc": "smalltalk",
    "text/x-systemverilog": "verilog",
    "text/x-tcl": "tcl",
    "text/x-textile": "textile",
    "text/x-tiddlywiki": "tiddlywiki",
    "text/x-toml": "toml",
    "text/x-tornado": "tornado",
    "text/x-vb": "vb",
    "text/x-verilog": "verilog",
    "text/x-yaml": "yaml",
    "text/x-z80": "z80"
};

caching.init = function init(minify, callback) {
    doMinify = minify;
    async.series([
        compileResources,
        readThemes,
        readModes,
        readLibs
    ], function (err, results) {
        if (err) return callback(err);
        var cache = { res: results[0], themes: {}, modes: {}, lib: {} };

        Object.keys(results[1]).forEach(function (theme) {
            cache.themes[theme] = {data: results[1][theme], etag: etag, mime: mime.lookup("css")};
        });

        Object.keys(results[2]).forEach(function (mode) {
            cache.modes[mode] = {data: results[2][mode], etag: etag, mime: mime.lookup("js")};
        });

        Object.keys(results[3]).forEach(function (file) {
            cache.lib[file] = {data: results[3][file], etag: etag, mime: mime.lookup(path.basename(file))};
        });

        addGzip(cache, function (err, cache) {
            cache.etags = {};
            callback(err, cache);
        });
    });
};

// Create gzip compressed data
function addGzip(cache, callback) {
    var types = Object.keys(cache), funcs = [];
    types.forEach(function (type) {
        funcs.push(function (cb) {
            gzipMap(cache[type], cb);
        });
    });
    async.parallel(funcs, function (err, results) {
        if (err) return callback(err);
        types.forEach(function (type, index) {
            cache[type] = results[index];
        });
        callback(null, cache);
    });
}

function gzipMap(map, callback) {
    var names = Object.keys(map), funcs = [];
    names.forEach(function (name) {
        funcs.push(function (cb) {
            gzip(map[name].data, cb);
        });
    });
    async.parallel(funcs, function (err, results) {
        if (err) return callback(err);
        names.forEach(function (name, index) {
            map[name].gzip = results[index];
        });
        callback(null, map);
    });
}

function gzip(data, callback) {
    zlib.gzip(data, function (err, gzipped) {
        if (err) return callback(err);
        callback(null, gzipped);
    });
}

function readThemes(callback) {
    var themes = {};
    fs.readdir(themesPath, function (err, filenames) {
        if (err) return callback(err);

        var files = filenames.map(function (name) {
            return path.join(themesPath, name);
        });

        async.map(files, fs.readFile, function (err, data) {
            if (err) return callback(err);

            filenames.forEach(function (name, index) {
                if (doMinify)
                    themes[name.replace(".css", "")] = cleanCSS.minify(data[index].toString());
                else
                    themes[name.replace(".css", "")] = data[index].toString();
            });

            callback(err, themes);
        });
    });
}

function readModes(callback) {
    var modes = {};
    Object.keys(modesByMime).forEach(function (mime) {
        var mode = modesByMime[mime];
        if (!modes[mode]) modes[mode] = "";
    });

    var cbDue = 0, cbFired = 0, ret = {};
    Object.keys(modes).forEach(function (mode) {
        cbDue++;
        fs.readFile(path.join(modesPath, mode, mode + ".js"), function (err, data) {
            if (err) callback(err);
            cbFired++;

            if (doMinify)
                ret[mode] = uglify.minify(data.toString(), {fromString: true, compress: {unsafe: true, screw_ie8: true}}).code;
            else
                ret[mode] = data.toString();

            if (cbFired === cbDue) callback(null, ret);
        });
    });
}

function readLibs(callback) {
    var ret = {};
    async.each(Object.keys(libs), function (p, cb) {
        fs.readFile(path.join(paths.module, p), function (err, data) {
            ret[libs[p]] = data;
            cb(err);
        });
    }, function (err) {
        callback(err, ret);
    });
}

function compileResources(callback) {
    var resData  = {}, resCache = {},
        out      = { css : "", js  : "" };

    // Read resources
    Object.keys(caching.files).forEach(function (type) {
        resData[type] = caching.files[type].map(function read(file) {
            var data;
            try {
                data = fs.readFileSync(path.join(paths.module, file)).toString("utf8");
            } catch (error) {
                return callback(error);
            }
            return data;
        });
    });

    // Concatenate CSS and JS
    resData.css.forEach(function (data) {
        out.css += data + "\n";
    });

    // Append a semicolon to each javascript
    resData.js.forEach(function (data) {
        out.js += data + ";\n";
    });

    // Add SVG object
    var svgDir = paths.svg, svgData = {};
    fs.readdirSync(svgDir).forEach(function (name) {
        svgData[name.slice(0, name.length - 4)] = fs.readFileSync(path.join(svgDir, name), "utf8");
    });
    out.js = out.js.replace("/* {{ svg }} */", "droppy.svg = " + JSON.stringify(svgData) + ";");

    // Insert Templates Code
    var templateCode = "var t = {fn:{},views:{}};";
    resData.templates.forEach(function (data, index) {
        // Produce the doT functions
        templateCode += dottemplates
            .produceFunction("t." + caching.files.templates[index].replace(/\.dotjs$/, "")
            .split("/").slice(2).join("."), data);
    });
    templateCode += ";";
    out.js = out.js.replace("/* {{ templates }} */", templateCode);

    // Add CSS vendor prefixes
    try {
        out.css = autoprefixer.process(out.css).css;
    } catch (e) {
        return callback(e);
    }

    if (doMinify) {
        out.js  = uglify.minify(out.js, { fromString: true, compress: { unsafe: true, screw_ie8: true } }).code;
        out.css = cleanCSS.minify(out.css);
    }

    // Save compiled resources
    while (caching.files.html.length) {
        var name = path.basename(caching.files.html.pop()),
            data = resData.html.pop()
                .replace(/\{\{version\}\}/gm, pkg.version)
                .replace(/\{\{name\}\}/gm, pkg.name);

        if (doMinify) {
            data = htmlMinifier.minify(data, {
                removeComments: true,
                collapseWhitespace: true,
                collapseBooleanAttributes: true,
                removeRedundantAttributes: true,
                caseSensitive: true,
                minifyCSS: true
            });
        }

        resCache[name] = {data: data, etag: etag, mime: mime.lookup("html")};
    }
    resCache["client.js"] = {data: out.js, etag: etag, mime: mime.lookup("js")};
    resCache["style.css"] = {data: out.css, etag: etag, mime: mime.lookup("css")};

    // Read misc files
    caching.files.other.forEach(function (file) {
        var data, date,
            name     = path.basename(file),
            fullPath = path.join(paths.module, file);

        try {
            data = fs.readFileSync(fullPath);
            date = fs.statSync(fullPath).mtime;
        } catch (err) {
            callback(err);
        }

        resCache[name] = {
            data: data,
            etag: crypto.createHash("md5").update(String(date)).digest("hex"),
            mime: mime.lookup(name)
        };
    });
    callback(null, resCache);
}

exports = module.exports = caching;
