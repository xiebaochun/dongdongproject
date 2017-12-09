var fs = require('fs');
var path = require('path');

// 引入 gulp
var gulp = require('gulp');
var del = require('del');
var replace = require('gulp-replace');
//https://browsersync.io/
var browserSync = require('browser-sync').create();
var uglify = require("gulp-uglify");
var csso = require('gulp-csso');
//var rename = require('gulp-rename');
var sass = require('gulp-sass');
var imagemin = require('gulp-imagemin');
var gutil = require('gulp-util');
var jshint = require("gulp-jshint");
var cache = require('gulp-cache');
var plumber = require('gulp-plumber');
var dom = require('gulp-dom');
var strip = require('gulp-strip-comments'); //删除注释
var rev = require('gulp-rev');
var revCollector = require('gulp-rev-collector');
var fontSpider = require('gulp-font-spider');
//另一款https://github.com/progrape/gulp-spriters
var spritesmith = require('gulp.spritesmith');
var autoprefixer = require('gulp-autoprefixer'); // 自动添加css前缀
var runSequence = require('run-sequence');


var AUTOPREFIXER_BROWSERS = [
    'last 6 version',
    'ie >= 6',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.0',
    'bb >= 10'
];

//读取配置文件
var project = JSON.parse(fs.readFileSync('project.json')) || {};

var paths = {
    dev: {
        dir: './',
        css: './css',
        js: './js',
        img: './img'
    },
    src: {
        dir: './',
        img: './img/**/*.{JPG,jpg,png,gif,svg}',
        sprite: './sprite',
        slice: './img/slice/*.png',
        js: './js/**/*.js',
        css: './scss/*.*',
        scss: './scss/*.*',
        html: './*.html',
        rev: './rev'
    },
    dist: {
        dir: './dist',
        css: './dist/css',
        img: './dist/img',
        js: './dist/js',
        json: './rev/**/*.json',
        sprite: './dist/sprite'
    }
};

var srcDir = path.resolve(process.cwd(), paths.src.sprite);
/**
 * 获取获取文件名字和路径
 * @returns 
 */
var iconFolder = function() {
    var filesSrc = []; // 文件路径
    var filesName = []; // 文件名字

    // 遍历获取文件名字和路径
    fs.readdirSync(srcDir).forEach(function(file, i) {
        var reg = /\.(png|jpg|gif|ico)/g;
        var isImg = file.match(reg);

        // 判读是  file.indexOf('sprite') != -1
        if (!isImg) {
            filesName.push(file);
            filesSrc.push(path.resolve(srcDir, file, '*.{png,jpg}'));
        }
    });
    // 返回文件名字和路径
    return {
        'name': filesName,
        'src': filesSrc
    };
};

/**
 * 
 * 支持多个文件夹编译生成雪碧图
 * 雪碧图制作规定要求
 * 在images文件夹下icon文件夹,新建一个文件夹就可以
 * 
 */
var csssPrites = function() {
    var folder = iconFolder();
    var folderName = folder.name;
    var folderSrc = folder.src;

    folderSrc.forEach(function(item, i) {
        var fileNameArr = folderName[i].split("_");
        var fileName = fileNameArr[0];
        //top-down	left-right	diagonal	alt-diagonal	binary-tree
        //top-down 从上到下，适合水平重复
        //left-right 从左到右，适合垂直固定宽度重复
        //diagonal \ 斜线，适合上两者的结合
        //alt-diagonal / 同上
        //binary-tree 默认的值，适合固定宽高的元素集合

        var fileAlgorithm = fileNameArr[1] || 'binary-tree';
        var imgName = 'img/sprite_${fileName}.png';
        var cssName = 'scss/sprite_${fileName}.scss';

        return gulp.src(item) // 需要合并的图片地址
            .pipe(spritesmith({
                imgName: imgName, // 保存合并后图片的地址
                cssName: cssName, // 保存合并后对于css样式的地址
                padding: 10, // 合并时两个图片的间距
                algorithm: fileAlgorithm, // 注释1
                cssFormat: 'scss',
                //cssTemplate: './cssTemplate.tpl' // 模板
                cssTemplate: function(data) {
                    var arr = [];
                    data.sprites.forEach(function(sprite) {
                        arr.push("@mixin icon-" + fileName + "-" + sprite.name +
                            "{" +
                            "background: url('" + sprite.escaped_image + "') no-repeat " + sprite.px.offset_x + " " + sprite.px.offset_y + ";" +
                            "width:" + sprite.px.width + ";" +
                            "height:" + sprite.px.height + ";" +
                            "}\n");
                    });
                    return arr.join("");
                }
            }))
            .pipe(gulp.dest(paths.src.dir));
    });
};

gulp.task('clean-dev', function(cb) {
    return del([paths.dev.dir], cb);
});

gulp.task('clean-dist', function(cb) {
    return del([paths.dist.dir], cb);
});

//-------------
//发布任务
gulp.task('dist-html', function() {
    gulp.src([paths.dist.json, paths.src.html])
        .pipe(plumber())
        .pipe(revCollector({
            replaceReved: true
        }))
        .pipe(replace(/('|")(img|css|js)\//g, '$1' + project.link + '$2/'))
        .pipe(strip())
        .pipe(gulp.dest(paths.dist.dir))
        .pipe(dom(function() {
            var t = this;

            if (project.task.checkTitle) {
                var title = t.querySelectorAll('title')[0];
                if (title) {
                    if (title.innerHTML.indexOf("小树") === -1) {
                        gutil.log(gutil.colors.red("标题必须包含“小树”： ") + title.innerHTML);
                    }
                } else {
                    gutil.log(gutil.colors.red("连个标题都没有！~~~~(>_<)~~~~ "));
                }
            }

            if (project.task.checkH1) {
                var h1 = t.querySelectorAll('h1')[0];
                if (!h1 || h1.innerHTML.length < 3) {
                    gutil.log(gutil.colors.red("必须包含h1标签！"));
                }
            }

            if (project.task.checkDescKeyword) {
                var desc = t.querySelectorAll('meta[name="description"]')[0];
                var kwd = t.querySelectorAll('meta[name="keywords"]')[0];
                if (!desc) {
                    gutil.log(gutil.colors.red("必须包含描述标签！"));
                } else {

                }

                if (!kwd) {
                    gutil.log(gutil.colors.red("缺少关键字标签！"));
                } else {
                    var kwd_con = kwd.getAttribute("content");
                    if (kwd_con.indexOf("，") !== -1) {
                        gutil.log(gutil.colors.red("关键字标签包含了中文逗号！"));
                    }
                }
            }

            if (project.task.checkCharset) {
                var charset = t.querySelectorAll('[charset]')[0];
                if (charset) {
                    if (charset.getAttribute("charset").toUpperCase() !== "UTF-8") {
                        gutil.log(gutil.colors.red("charset需要声明为 utf-8！"));
                    }
                } else {
                    gutil.log(gutil.colors.red("缺少charset声明标签！"));
                }
            }

            if (project.task.checkLang) {
                var lang = t.querySelectorAll('head')[0].getAttribute("lang");
                if (lang && lang.toUpperCase() === "CH") {
                    gutil.log(gutil.colors.red("ch为不合法值，请考虑将lang声明为 zh-CN 或者去掉lang属性！"));
                }
            }

            var scripts = t.querySelectorAll('script');
            var hastongjiJS = false;
            var hasTopbarJS = false;

            scripts = Array.prototype.slice.call(scripts);
            scripts.forEach(function(val, inx) {
                var src = val.getAttribute("src");
                if (!src) {
                    src = val.innerHTML;
                }
                if (src.indexOf("_count.js") !== -1) {
                    hastongjiJS = true;
                }
                if (src.indexOf("topbar.last.js") !== -1) {
                    hasTopbarJS = true;
                }
                //gutil.log(val.getAttribute("src"));
            });

            // if (project.task.checkTongjiJS && !hastongjiJS) {
            //     gutil.log(gutil.colors.red("请引入统计文件！"));
            // }

            // if (project.task.checkTopbar && !hasTopbarJS) {
            //     gutil.log(gutil.colors.red("请引入"));
            // }

            return this;
        }));
});

gulp.task('sprite', function() {
    csssPrites();
    /*var spriteData = gulp.src("./source/img/slice/*.png").pipe(spritesmith({
    imgName: 'sprite.png',
    cssName: 'sprite.scss',
    cssFormat: 'scss',
    padding:10
    }));  
    return spriteData.pipe(gulp.dest(paths.dist.img));*/
});
gulp.task('fontspider', function() {
    return gulp.src('index.html')
        .pipe(fontSpider());
});

gulp.task('dist-css', function() {
    return gulp.src(paths.src.css)
        .pipe(plumber())
        .pipe(sass()).on('error', gutil.log)
        .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(csso())
        .pipe(rev())
        .pipe(gulp.dest(paths.dist.css))
        .pipe(rev.manifest("rev-manifest-css.json"))
        //.pipe(rename('index.css'))
        .pipe(gulp.dest(paths.src.rev));
});

gulp.task('dist-img', function() {
    gulp.src(paths.src.img)
        .pipe(plumber())
        .pipe(cache(imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        }))).on('error', gutil.log)
        .pipe(gulp.dest(paths.dist.img));
});

gulp.task('dist-js', function() {
    return gulp.src(paths.src.js) // 要压缩的js文件
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter())
        .pipe(uglify()).on('error', gutil.log)
        //.pipe(rename('index.js'))
        .pipe(rev())
        .pipe(gulp.dest(paths.dist.js))
        .pipe(rev.manifest("rev-manifest-js.json"))
        .pipe(gulp.dest(paths.src.rev)); // write manifest to build dir 
});


//-------------
//开发任务
gulp.task('dev-html', function() {
    gulp.src(paths.src.html)
        .pipe(plumber())
        .pipe(gulp.dest(paths.dev.dir));
});

gulp.task('dev-css', function() {
    gulp.src(paths.src.css)
        .pipe(plumber())
        .pipe(sass({outputStyle: 'compact'})).on('error', gutil.log)
        .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
        //.pipe(rename('index.css'))
        .pipe(gulp.dest(paths.dev.css))
        .pipe(browserSync.stream());
});

gulp.task('dev-img', function() {
    gulp.src(paths.src.img)
        .pipe(plumber())
        .pipe(gulp.dest(paths.dev.img));
});

gulp.task('dev-js', function() {
    gulp.src(paths.src.js) // 要压缩的js文件
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter())
        //.pipe(rename('index.js'))
        //.pipe(gulp.dest(paths.dev.js));
});

gulp.task('reload', function() {
    browserSync.reload();
});

gulp.task('dev', ['dev-css', 'dev-js'], function() {
    //开启测试服
    //监控css、js、html修改
    //编译scss
    //编译es6 ？
    //检查js
    //传送其余所有文件
    browserSync.init({
        server: paths.dev.dir
    });

    gulp.watch(paths.src.html, ['reload']);
    gulp.watch(paths.src.css, ['dev-css']);
    gulp.watch(paths.src.js, ['dev-js', 'reload']);
});

gulp.task('dist', function(callback) {
    //编译scss 压缩css
    //编译es6 ？
    //检查、压缩js
    //压缩图片→改成手动压缩，并且保存在源码目录
    //修改引用路径
    //传送其余所有文件
    runSequence('clean-dist',
        'dist-css',
        'dist-js',
        'dist-html',
        callback);
});


// 默认任务
gulp.task('default', ['cleandev'], function() {
    //默认任务清除文件夹
});