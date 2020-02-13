module.exports = function (grunt) {
	grunt.initConfig({
		eslint: {
			src: ["."],
			options: {
				format: "junit"
			}
		},
		jsonlint: {
			src: ["*.json"],
			options: {
				formatter: "prose",
				format: true,
				indent: 2
			}
		},
		yamllint: {
			src: [".travis.yml", ".codeclimate.yml"],
			options: {
				schema: "DEFAULT_SAFE_SCHEMA"
			}
		},
		csslint: {
			src: ["netatmo.css"],
			options: {
				formatters: [
					{ id: "lint-xml", dest: "report/csslint.jslint.xml" },
					{ id: "csslint-xml", dest: "report/csslint.xml" }
				]
			}
		}
	});

	//grunt.loadNpmTasks('grunt-contrib-less');
	//grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks("grunt-contrib-csslint");
	//grunt.loadNpmTasks("grunt-contrib-eslint");
	grunt.loadNpmTasks("grunt-jsonlint");
	grunt.loadNpmTasks("grunt-yamllint");
	grunt.loadNpmTasks("gruntify-eslint");

	grunt.registerTask("default", ["test"]);
	grunt.registerTask("test", ["eslint", "jsonlint", "csslint", "yamllint"]);
};
