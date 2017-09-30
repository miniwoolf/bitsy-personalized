/* QUESTIONS
shallow dialog blocks? ''' dialog block '''
or nestable dialog blocks?
	/"
		dialog block 
		{
			code block
			/"dialog"/
			code
		}
		dialog
	"/

significant whitespace?

{code} is a single expression? or a block?
{exp}
{exp}
vs
{
	exp
	exp
}

separate syntax for code block vs expression? e.g. double braces

return value from expression/code block?

{case
	* condition
		result
	* condition
		result
}
vs
{
if condition
	result
elseif condition
	result
}

{choice
	* choice1
		result
	* choice2
		result
}
vs
{
* choice1
	result
* choice2
	result
}
*/

/* NEW PARSE TODO
- attach dialog commands to dialog renderer
- parse code
- parse functions
- parse special functions: case, choice?
- formatting / text effects
- replace old parsing code
- expressions parsing
- function library
- variable library
- nail down syntax of case statements, multline code, whitespace, etc.
- replace root node with block (of either type)
	- should blocks be "type:block" "kind:dialog"??
	- or do they even need to be identified???

- scriptEnvironment -> fills -> dialogBuffer
- dialogRenderer -> draws -> dialogBuffer

- is code called immediately? or after dialog finishes rendering?
- IDEA: use special "script characters" injected into dialog buffer to launch scripts and effects during dialog
	- what about scripts with no dialog? should they depend on the buffer?

- ScriptParser -> outputs -> ScriptTree
- ScriptEnvironment -> runs -> ScriptTree
- environment needs a way to wait on dialog buffer (handler)
*/

/*
function
	name
	parameters
variable
	type (needed?)
block
	type
*/

/* MORE SYNTAX QUESTIONS

	dialog: /" text text "/ vs << text text >> vs (more limited) ''' text text '''

	should there even BE a dialog block? or is that just default behavior for top level?

	in IF STATEMENT, default code or default dialog?

	IF vs CASE

	{single expression per bracket} <- more LISP-like
	vs
	{
		multiple expressions
		on each
		new line
	} <- more like inserting a JS block
*/

function Script() {

this.CreateInterpreter = function() {
	return new Interpreter();
};

var Interpreter = function() {
	var env = new Environment();
	var parser = new Parser( env );

	this.SetDialogBuffer = function(buffer) { env.SetDialogBuffer( buffer ); };

	this.Run = function(scriptStr, exitHandler) {
		console.log("RUNNNN");
		var tree = parser.Parse( scriptStr );
		tree.Eval( env, 
			function() {

				console.log("MAIN SRIPT DONE!!!");
				console.log( env.GetDialogBuffer() != null );

				// if( env.GetDialogBuffer() != null && env.GetDialogBuffer().CanContinue() ) {

					console.log("WAIT TO END");

					// we have a dialog buffer we need to wait for!
					var endFlag = { ready:false };
					env.GetDialogBuffer().WaitToEnd( endFlag );

					function checkContinue() {
						console.log("END? " + endFlag.ready);
						if(endFlag.ready) {
							console.log("SCRIPT DONE!!!!!!!!");
							if(exitHandler != null) exitHandler(); // the end!
						}
						else {
							setTimeout( function() {
								checkContinue();
							}, 0);
						}
					}
					checkContinue();
				// }
				// else {					
				// 	console.log("SCRIPT DONE!!!!!!!!");
				// 	if(exitHandler != null) exitHandler(); // the end!
				// }

			}
		);
	}

	this.ResetEnvironment = function() {
		env = new Environment();
		parser = new Parser( env );
	}
}


/* BUILT-IN FUNCTIONS */ // TODO: better way to encapsulate these?
/*
possitble names
	- print
	- say
	- speak
	- text
	- talk
	- dialog
*/
function sayFunc(environment,parameters,onReturn) {
	console.log("SAY FUNC");
	if( parameters[0] ) {
		var textStr = parameters[0].toString();
		var continueFlag = {
			ready : false
		};
		environment.GetDialogBuffer().AddText( textStr, continueFlag );

		// wait until the dialog is finished before continuing with the script
		function checkContinue() {
			if(continueFlag.ready) {
				onReturn(null); // return null or return the string?
			}
			else {
				setTimeout( function() {
					checkContinue();
				}, 0);
			}
		}
		checkContinue();
	}
	else
		onReturn(null);
}

function linebreakFunc(environment,parameters,onReturn) {
	console.log("LINEBREAK FUNC");
	environment.GetDialogBuffer().AddLinebreak();
	onReturn(null);
}

function rainbowFunc(environment,parameters,onReturn) {
	if( environment.GetDialogBuffer().HasTextEffect("rainbow") )
		environment.GetDialogBuffer().RemoveTextEffect("rainbow");
	else
		environment.GetDialogBuffer().AddTextEffect("rainbow");
	onReturn(null);
}

function itemFunc(environment,parameters,onReturn) {
	var itemId = parameters[0];
	var itemCount = player().inventory[itemId] ? player().inventory[itemId] : 0; // TODO : ultimately the environment should include a reference to the game state
	console.log("ITEM FUNC " + itemId + " " + itemCount);
	onReturn(itemCount);
}

/* BUILT-IN OPERATORS */
function setExp(environment,left,right,onReturn) {
	// environment.SetVariable( left.name, right.Eval(environment) );
	// return left.Eval(environment);

	if(left.type != "variable") {
		// not a variable! return null and hope for the best D:
		onReturn( null );
		return;
	}

	right.Eval(environment,function(rVal) {
		environment.SetVariable( left.name, rVal );
		left.Eval(environment,function(lVal) {
			onReturn( lVal );
		});
	});
}
function equalExp(environment,left,right,onReturn) {
	// return left.Eval(environment) === right.Eval(environment); 
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal === rVal );
		});
	});
}
function greaterExp(environment,left,right,onReturn) {
	// return left.Eval(environment) > right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal > rVal );
		});
	});
}
function lessExp(environment,left,right,onReturn) {
	// return left.Eval(environment) < right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal < rVal );
		});
	});
}
function greaterEqExp(environment,left,right,onReturn) {
	// return left.Eval(environment) >= right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal >= rVal );
		});
	});
}
function lessEqExp(environment,left,right,onReturn) {
	// return left.Eval(environment) <= right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal <= rVal );
		});
	});
}
function multExp(environment,left,right,onReturn) {
	// return left.Eval(environment) * right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal * rVal );
		});
	});
}
function divExp(environment,left,right,onReturn) {
	// return left.Eval(environment) / right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal / rVal );
		});
	});
}
function addExp(environment,left,right,onReturn) {
	// return left.Eval(environment) + right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal + rVal );
		});
	});
}
function subExp(environment,left,right,onReturn) {
	// return left.Eval(environment) - right.Eval(environment);
	right.Eval(environment,function(rVal){
		left.Eval(environment,function(lVal){
			onReturn( lVal - rVal );
		});
	});
}

/* ENVIRONMENT */
var Environment = function() {
	var dialogBuffer = null;
	this.SetDialogBuffer = function(buffer) { dialogBuffer = buffer; };
	this.GetDialogBuffer = function() { return dialogBuffer; };

	var functionMap = new Map();
	functionMap.set("say", sayFunc);
	functionMap.set("linebreak", linebreakFunc);
	functionMap.set("item", itemFunc);
	functionMap.set("rbw", rainbowFunc);

	this.HasFunction = function(name) { return functionMap.has(name); };
	// this.EvalFunction = function(name,parameters) {
	// 	return functionMap.get( name )( this, parameters );
	// }
	this.EvalFunction = function(name,parameters,onReturn) {
		console.log(functionMap);
		console.log(name);
		functionMap.get( name )( this, parameters, onReturn );
	}

	var variableMap = new Map();
	variableMap.set("x", "0"); // TODO : remove test variable
	variableMap.set("msg", "A variable message!");
	variableMap.set("y", 5);

	this.HasVariable = function(name) { return variableMap.has(name); };
	this.GetVariable = function(name) { return variableMap.get(name); };
	this.SetVariable = function(name,value) { variableMap.set(name, value); };

	var operatorMap = new Map();
	operatorMap.set("=", setExp);
	operatorMap.set("==", equalExp);
	operatorMap.set(">", greaterExp);
	operatorMap.set("<", lessExp);
	operatorMap.set(">=", greaterEqExp);
	operatorMap.set("<=", lessEqExp);
	operatorMap.set("*", multExp);
	operatorMap.set("/", divExp);
	operatorMap.set("+", addExp);
	operatorMap.set("-", subExp);

	this.HasOperator = function(sym) { return operatorMap.get(sym); };
	// this.EvalOperator = function(sym,left,right) {
	// 	return operatorMap.get( sym )( this, left, right );
	// }
	this.EvalOperator = function(sym,left,right,onReturn) {
		operatorMap.get( sym )( this, left, right, onReturn );
	}
}

/* node ideas
	- TreeRelationship -> HasChildren
	- NodeCore / NodeBase : type
	- do I really need modes for blocks?
	- do I really need a special command for linebreaks? or just use it as a character?
*/
/* NODES */
var TreeRelationship = function() {
	this.parent = null;
	this.children = [];
	this.AddChild = function(node) {
		this.children.push( node );
		node.parent = this;
	};
}

// var Runnable = function() {
// 	this.Run = function(environment) {
// 		if( this.Eval )
// 			this.Eval(environment);

// 		var i = 0;
// 		while (i < this.children.length) {
// 			this.children[i].Run(environment);
// 			i++;
// 		}
// 	}
// }

// TEMP: trying without mode
// var BlockMode = {
// 	Dialog : "dialog",
// 	Code : "code"
// };

var BlockNode = function(/*mode*/) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "block";
	// this.mode = mode;

	// this.Eval = function(environment) {
	// 	var lastVal = null;
	// 	var i = 0;
	// 	while (i < this.children.length) {
	// 		lastVal = this.children[i].Eval(environment);
	// 		i++;
	// 	}
	// 	return lastVal;
	// }
	this.Eval = function(environment,onReturn) {
		var lastVal = null;
		var i = 0;
		function evalChildren(children,done) {
			if(i < children.length) {
				children[i].Eval( environment, function(val) {
					lastVal = val;
					i++;
					evalChildren(children,done);
				} );
			}
			else {
				done();
			}
		};
		evalChildren( this.children, function() {
			onReturn(lastVal);
		} );
	}
}

// ???: Make FuncNode subclasses with functionality? or separate the nodes from the functions?
var FuncNode = function(name,arguments) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "function";
	this.name = name;
	this.arguments = arguments;

	// this.Eval = function(environment) {
	// 	var argumentValues = [];
	// 	for(var i = 0; i < this.arguments.length; i++) {
	// 		argumentValues.push( this.arguments[i].Eval( environment ) );
	// 	}
	// 	console.log("ARGS");
	// 	console.log(argumentValues);
	// 	return environment.EvalFunction( this.name, argumentValues );
	// }
	this.Eval = function(environment,onReturn) {
		var argumentValues = [];
		var i = 0;
		function evalArgs(arguments,done) {
			if(i < arguments.length) {
				// Evaluate each argument
				arguments[i].Eval( environment, function(val) {
					argumentValues.push( val );
					i++;
					evalArgs(arguments,done);
				} );
			}
			else {
				done();
			}
		};
		var self = this; // hack to deal with scope
		evalArgs( this.arguments, function() {
			// Then evaluate the function
			console.log("ARGS");
			console.log(argumentValues);
			environment.EvalFunction( self.name, argumentValues, onReturn );
		} );
	}
}

// TODO : do literals and variables need to be nodes?
// IF SO: should they be children of functions???
var LiteralNode = function(value) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "literal";
	this.value = value;

	// this.Eval = function(environment) {
	// 	return this.value;
	// }
	this.Eval = function(environment,onReturn) {
		onReturn(this.value);
	}
}

var VarNode = function(name) {
	Object.assign( this, new TreeRelationship() );
	// Object.assign( this, new Runnable() );
	this.type = "variable";
	this.name = name;

	// this.Eval = function(environment) {
	// 	return environment.GetVariable( this.name );
	// }
	this.Eval = function(environment,onReturn) {
		onReturn( environment.GetVariable( this.name ) );
	} // TODO: might want to store nodes in the variableMap instead of values???
}

var ExpNode = function(operator, left, right) {
	Object.assign( this, new TreeRelationship() );
	this.type = "operator";
	this.operator = operator;
	this.left = left;
	this.right = right;

	// this.Eval = function(environment) {
	// 	var expVal = environment.EvalOperator( this.operator, this.left, this.right );
	// 	console.log("EVAL EXP " + this.operator + " " + expVal);
	// 	return expVal;
	// }
	this.Eval = function(environment,onReturn) {
		var self = this; // hack to deal with scope
		environment.EvalOperator( this.operator, this.left, this.right, 
			function(val){
				console.log("EVAL EXP " + self.operator + " " + val);
				onReturn(val);
			} );
		// NOTE : sadly this pushes a lot of complexity down onto the actual operator methods
	}
}

var Parser = function(env) {
	var environment = env;

	var Sym = {
		DialogOpen : "/\"",
		DialogClose : "\"/",
		CodeOpen : "{",
		CodeClose : "}",
		Linebreak : "\n", // just call it "break" ?
		Separator : ":",
		List : "*",
		String : '"'
	};

	var ParserState = function( rootNode, str ) {
		this.rootNode = rootNode;
		this.curNode = this.rootNode;

		var sourceStr = str;
		var i = 0;
		this.Index = function() { return i; };
		this.Count = function() { return sourceStr.length; };
		this.Done = function() { return i >= sourceStr.length; };
		this.Char = function() { return sourceStr[i]; };
		this.Step = function(n) { if(n===undefined) n=1; i += n; };
		this.MatchAhead = function(str) {
			// console.log(str);
			str = "" + str; // hack to turn single chars into strings
			// console.log(str);
			// console.log(str.length);
			for(var j = 0; j < str.length; j++) {
				if( i + j >= sourceStr.length )
					return false;
				else if( str[j] != sourceStr[i+j] )
					return false;
			}
			return true;
		}
		this.Peak = function(end) {
			var str = "";
			var j = i;
			// console.log(j);
			while(j < sourceStr.length && sourceStr[j] != end) {
				str += sourceStr[j];
				j++;
			}
			console.log("PEAK ::" + str + "::");
			return str;
		}
		this.ConsumeBlock = function( open, close ) {
			var startIndex = i;

			var matchCount = 0;
			if( this.MatchAhead( open ) ) {
				matchCount++;
				this.Step( open.length );
			}

			while( matchCount > 0 && !this.Done() ) {
				if( this.MatchAhead( close ) ) {
					matchCount--;
					this.Step( close.length );
				}
				else if( this.MatchAhead( open ) ) {
					matchCount++;
					this.Step( open.length );
				}
				else {
					this.Step();
				}
			}

			// console.log("!!! " + startIndex + " " + i);

			return sourceStr.slice( startIndex + open.length, i - close.length );
		}

		// var saveIndex = 0;
		// this.Save = function() { saveIndex = i; };
		// this.Restore = function() { i = saveIndex; };
	};

	this.Parse = function(scriptStr) {
		console.log("NEW PARSE!!!!!!");

		var state = new ParserState( new BlockNode(), scriptStr );

		if( state.MatchAhead(Sym.DialogOpen) ) {
			state = ParseDialogBlock( state );
		}
		else if( state.MatchAhead(Sym.CodeOpen) ) {
			state = ParseCodeBlock( state );
		}

		console.log( state.rootNode );
		return state.rootNode;
	};

	/*
	TODO
	improve rules for adding linebreak nodes
	- empty lines: YES
	- lines with text: YES
	- lines with JUST CODE: NO
	- first line of dialog block: NO
	*/
	function ParseDialog(state) {
		// for linebreak logic: add linebreaks after lines with dialog or empty lines (if it's not the very first line)
		var hasBlock = false;
		var hasDialog = false;
		var isFirstLine = true;

		var text = "";
		var addTextNode = function() {
			if (text.length > 0) {
				state.curNode.AddChild( new FuncNode( "say", [new LiteralNode(text)] ) );
				text = "";

				hasDialog = true;
			}
		}

		while ( !state.Done() ) {

			if( state.MatchAhead(Sym.DialogOpen) ) {
				addTextNode();
				state = ParseDialogBlock( state ); // These can be nested (should they though???)

				hasBlock = true;
			}
			else if( state.MatchAhead(Sym.CodeOpen) ) {
				addTextNode();
				state = ParseCodeBlock( state );

				hasBlock = true;
			}
			else {
				if ( state.MatchAhead(Sym.Linebreak) ) {
					addTextNode();

					var isLastLine = (state.Index() + 1) == state.Count();
					var hasBlockOnly = hasBlock && !hasDialog;
					var shouldAddLinebreak = !hasBlockOnly && !(isFirstLine || isLastLine);
					if( shouldAddLinebreak )
						state.curNode.AddChild( new FuncNode( "linebreak", [] ) ); // use function or character?

					// linebreak logic
					isFirstLine = false;
					hasBlock = false;
					hasDialog = true;

					text = "";
				}
				else {
					text += state.Char();
				}
				state.Step();
			}

		}
		addTextNode();

		console.log("PARSE DIALOG");
		console.log(state);
		return state;
	}

	function ParseDialogBlock(state) {
		var dialogStr = state.ConsumeBlock( Sym.DialogOpen, Sym.DialogClose );

		var dialogState = new ParserState( new BlockNode(), dialogStr );
		dialogState = ParseDialog( dialogState );

		state.curNode.AddChild( dialogState.rootNode );

		return state;
	}


	/*
	THINGS TO PARSE:
		- functions: func param1 param2
		- expressions: x = 5, x = y + z, etc.
		- nested blocks: { code }, /" text "/
			- the nested code blocks are especially tricky... do they return something?
		- special blocks:
			{case
				* condition
					result
				* condition
					result
			}

		if we assume block contains only one expression
			look at first symbol
				is it a function name?
					parse function
				else
					look for expressions, etc.
	*/

	/*
	PARAMETER possibilities
	- string
	- float
	- bool?
	- variable
	*/
	function ParseFunction(state, funcName) {
		var args = [];

		var curSymbol = "";
		function OnSymbolEnd() {
			curSymbol = curSymbol.trim();
			console.log("SYMBOL " + curSymbol);
			var num = parseFloat(curSymbol);
			console.log(num);
			console.log(environment.HasVariable(curSymbol));
			if(num) {
				/* NUMBER LITERAL */
				console.log("ADD NUM");
				args.push( new LiteralNode(num) );
			}
			else if( environment.HasVariable(curSymbol) ) {
				/* VARIABLE */
				args.push( new VarNode(curSymbol) );
			}
			curSymbol = "";
		}

		while( !( state.Char() === "\n" || state.Done() ) ) {
			if( state.MatchAhead(Sym.CodeOpen) ) {
				var codeBlockState = new ParserState( new BlockNode(), state.ConsumeBlock( Sym.CodeOpen, Sym.CodeClose ) );
				codeBlockState = ParseCode( codeBlockState );
				var codeBlock = codeBlockState.rootNode;
				args.push( codeBlock );
				curSymbol = "";
			}
			else if( state.MatchAhead(Sym.String) ) {
				/* STRING LITERAL */
				var str = state.ConsumeBlock(Sym.String, Sym.String);
				console.log("STRING " + str);
				args.push( new LiteralNode(str) );
				curSymbol = "";
			}
			else if(state.Char() === " " && curSymbol.length > 0) {
				OnSymbolEnd();
			}
			else {
				curSymbol += state.Char();
			}
			state.Step();
		}

		if(curSymbol.length > 0) {
			OnSymbolEnd();
		}

		state.curNode.AddChild( new FuncNode( funcName, args ) );

		return state;
	}

	var setSymbol = "=";
	var operatorSymbols = ["==", ">", "<", ">=", "<=", "*", "/", "+", "-"];
	function CreateExpression(expStr) {
		expStr = expStr.trim();
	
		var operator = null;

		// set is special because other operator can look like it, and it has to go first in the order of operations
		var setIndex = expStr.indexOf(setSymbol);
		if(setIndex > -1) { // it might be a set operator
			if( expStr[setIndex+1] != "=" && expStr[setIndex-1] != ">" && expStr[setIndex-1] != "<" ) {
				// ok it actually IS a set operator and not ==, >=, or <=
				operator = setSymbol;
				var left = CreateExpression( expStr.substring(0,setIndex) );
				var right = CreateExpression( expStr.substring(setIndex+setSymbol.length) );
				var exp = new ExpNode( operator, left, right );
				return exp;
			}
		}

		for( var i = 0; (operator == null) && (i < operatorSymbols.length); i++ ) {
			var opSym = operatorSymbols[i];
			var opIndex = expStr.indexOf( opSym );
			if( opIndex > -1 ) {
				operator = opSym;
				var left = CreateExpression( expStr.substring(0,opIndex) );
				var right = CreateExpression( expStr.substring(opIndex+opSym.length) );
				var exp = new ExpNode( operator, left, right );
				return exp;
			}
		}

		if( operator == null ) {
			if(expStr[0] === Sym.CodeOpen) {
				// CODE BLOCK!!!
				var codeBlockState = new ParserState( new BlockNode(), expStr );
				codeBlockState = ParseCodeBlock( codeBlockState ); // TODO: I think this will create too many nested blocks
				return codeBlockState.rootNode;
			}
			else if( environment.HasVariable(expStr) ) {
				return new VarNode(expStr);
			}
			else if( parseFloat(expStr) ) {
				return new LiteralNode( parseFloat(expStr) );
			}
			else {
				// uh oh
				return new LiteralNode(null);
			}
			// TODO : strings I guess
		}
	}

	function ParseExpression(state) {
		var line = state.Peak( Sym.Linebreak );
		console.log("EXPRESSION " + line);
		var exp = CreateExpression( line );
		console.log(exp);
		state.curNode.AddChild( exp );
		state.Step( line.length );
		return state;
	}

	function ParseCode(state) {
		// TODO : how do I do this parsing??? one expression per block? or per line?
		while ( !state.Done() ) {

			if( state.MatchAhead(Sym.DialogOpen) ) {
				state = ParseDialogBlock( state ); // These can be nested (should they though???)
			}
			else if( state.MatchAhead(Sym.CodeOpen) ) {
				state = ParseCodeBlock( state );
			}
			else if( environment.HasFunction( state.Peak(" ") ) ) { // TODO --- what about newlines???
				var funcName = state.Peak(" ");
				state.Step( funcName.length );
				state = ParseFunction( state, funcName );
			}
			else {
				state = ParseExpression( state );
			}
		}

		return state;
	}

	function ParseCodeBlock(state) {
		var codeStr = state.ConsumeBlock( Sym.CodeOpen, Sym.CodeClose );

		console.log("PARSE CODE");
		console.log(codeStr);

		var codeState = new ParserState( new BlockNode(), codeStr );
		codeState = ParseCode( codeState );
		
		state.curNode.AddChild( codeState.rootNode );

		// eat next linebreak
		// if( state.MatchAhead( Sym.Linebreak ) )
		// 	state.Step();

		return state;
	}

}

// hack
// this.NewParse = function(dialogStr) {
// 	var p = new Parser();
// 	return p.Parse( dialogStr );
// }

} // Script()