class App
	constructor: ->
		@editor=CodeMirror.fromTextArea document.getElementById("code"),
			lineNumbers: true
			matchBrackets: true
			theme: "xq-light"
		@query=CodeMirror.fromTextArea document.getElementById("query"),
			lineNumbers: true
			matchBrackets: true
			theme: "xq-light"
		@query.setSize('100%','100px')
		$("button").click @execute
		$('code').closest('.row-fluid').hide()
		@loadExamples()
		$("a.example").first().click()

	loadExamples: =>
		$('#example_list *').remove()
		for example in window.examples
			$('#example_list').append("<li><a class='example'>#{example.name}</a></li>")
			$('#example_list a').last()
				.attr('data-ruleset',example.ruleset.join('\n'))
				.attr('data-query',example.query)
		$("a.example").click @example

	execute: (event)=>
		$('button').addClass('disabled')
		$('code').closest('.row-fluid').hide()
		$.post '/datalog', { ruleset: @editor.getValue(), query: @query.getValue() }, (res)=>
			if res.error? && res.error.length!=0
				$('#error').text res.error.replace /\n/g,"\n"
				$('#error').closest('.row-fluid').show()
			else
				$('#result').text res.answer.replace /\n/g,"\n"
				$('#result').closest('.row-fluid').show()
			$('button').removeClass('disabled')
		false

	example: (event)=>
		@editor.setValue($(event.currentTarget).attr('data-ruleset'))
		@query.setValue($(event.currentTarget).attr('data-query'))
		@execute()
		true

new App

