// array of correct condition values
const CORRECT_CONDITION_VALUES = ["eq","neq","gt","gte","contains"];
//stores the data type of the data field
let dataFieldType;
//stores the name of the required field that is not passed
let requiredField;
/**starts the rule validation process
*@param {object} req - Express request object
*@param {object} res - Express response object
*/
function ruleValidationRouter(req,res){
	let data = req.body;
	if(req.headers["content-type"].indexOf("application/json") != -1){
	let isObjProto = isObjectPrototype(data);
	if(isObjProto){
		if(checkPropertiesPresence(data,["rule","data"])){
			ruleFieldOperations(req,res,data.rule,data.data);
			
		}
		else{
			res.status(400).json({message:requiredField+" is required.",status:"error",data:null});
		}
	}
	else{
		res.status(400).json({message:"Invalid JSON payload passed.",status:"error",data:null});
	
	}
	
	}
	else{
		res.status(400).json({message:"Invalid JSON payload passed.",status:"error",data:null});
	}
}

/**checks to see that the object passed has Object.prototype has its prototype
*@param {object} data
*@return {boolean}
*/
function isObjectPrototype(data){
	let isObjectPrototype = Object.prototype.isPrototypeOf(Object.getPrototypeOf(data)) ? false : true;
	return isObjectPrototype;
}
/**checks to see that the properties given exist in the object
*@param {object} data
*@param {array} properties
*@return {boolean}
*/
function checkPropertiesPresence(data,properties){
	for(let property in properties){
		if(!data.hasOwnProperty(properties[property])){
			requiredField = properties[property];
			return false;	
		}
	}
	return true;

}
/**takes care of operations concerning the rule field
*@param {object} req - Express request object
*@param {object} res - Express response object
*@param {object} rule - the rule field
*@param {(object|array|string)} data - the data field
*/
function ruleFieldOperations(req,res,rule,data){
	let isObjProto = isObjectPrototype(rule);
	if(isObjProto){
		if(checkPropertiesPresence(rule,["field","condition","condition_value"])){
		dataFieldType = checkDataType(data)
		switch(dataFieldType){
			case "Object" : evaluateForObject(res,rule,data);
				    	break;
			case "Array"  : evaluateForArray(res,rule,data);
					break;
			case "String" : evaluateForString(res,rule,data);
					break;
			default    : 	res.status(400).json({message:"data should be an object|array|string.",status:"error",data:null});
				     	break;
		}
		
		}
		else{
			res.status(400).json({message:requiredField+" is required.",status:"error",data:null});
		}
	}
	else{
		res.status(400).json({message:"rule should be an object.",status:"error",data:null});
	}
}
/**recursive function parses the field property that is in the rule object. It does this by storing the field property value in an array then use recursion to fetch the value of the needed field in the data field
*@param {(object|array|string)} data - the data field
*@param {array} properties
*@param {number} [startingIndex = 0]
*@return {*}
*/
function parse(data,properties,startingIndex=0){
	let arrayLength=properties.length;
	let result = data;
	if(startingIndex<arrayLength){
	result = data.hasOwnProperty(properties[startingIndex]) ? data[properties[startingIndex]] : {missing_property:properties.join('.')};
		startingIndex++;
		result = parse(result,properties,startingIndex);
		
	}
	
	return result;
}
/**function checks to see that nesting in the data field is not more than two levels
@param {array} fieldProperty - an array that contains the nested objects name e.g., elements will be deck, card and first from "field":"deck.card.first"
@return {boolean}
*/
function nestingOkay(fieldProperty){
	return fieldProperty.length > 3 ? false : true;
}
/**function returns true if condition value in rule field is one of the accepted values, otherwise false
@param {string} condition
@return {boolean}
*/
function acceptConditionValue(condition){
	return containsElement(CORRECT_CONDITION_VALUES,condition) ? true : false;
}
/**functions returns true if an element is in an array, otherwise false
@param {array} array
@param {*} element
*/
function containsElement(array,element){
	for(let index in array){
		if(array[index] == element)
			return true;
	}
	return false;
}
/**function performs operations relating to data field
@param {(object|array|string)} data - the data field
*/
function dataFieldOperations(data){
	dataFieldType = checkDataType(data);
}

/**function checks and return the type of its argument
@param {*} data
@return {string}
*/
function checkDataType(data){
	switch(typeof data){
		case "string" : return "String";
		case "object" : return (() =>{
			if(data instanceof Array)
				return "Array";
			else if(isObjectPrototype(data))
				return "Object";
		})();
		case "number" : return "Number";
		default : return "Invalid";
	
	}
}
/**function compares the field value type with the condition_value type, returns true if both are compatible, otherwise false
*param {*} dataOne
*param {*} dataTwo
@return {boolean}
*/
function typeCompatible(dataOne,dataTwo){
	if(checkDataType(dataOne) == checkDataType(dataTwo))
		return true;
	else
		return false;
}
/**function is called when the field value is Object
@param {object} res - Express response object
@param {object} rule - the rule field
@param {(object|array|string)} data - the data field
*/
function evaluateForObject(res,rule,data){
	/*store the field property value in an array by using split
		e.g., "field":"deck.card.first" will be put in an array containing deck,card and first has its elements
		*/
		let fieldProperty = rule.field.split('.');
		if(nestingOkay(fieldProperty)){
			let fieldValue = parse(data,fieldProperty);
			if(checkDataType(fieldValue) == "Object" && fieldValue.hasOwnProperty("missing_property"))
				res.status(400).json({message:"field "+fieldValue.missing_property+" is missing from data.",status:"error",data:null});
			else
				checkConditionToProceed(res,rule,fieldValue)
		}
		else{
			res.status(400).json({message:rule.field+" should not be more than two levels deep.",status:"error",data:null});
		}
}
/**function is called when the field value is Array
@param {object} res - Express response object
@param {object} rule - the rule field
@param {(object|array|string)} data - the data field
*/
function evaluateForArray(res,rule,data){
	let index = parseInt(rule.field);
	if(isNaN(index)){
		res.status(400).json({message:rule.field+" should be a string.",status:"error",data:null});
	}
	else{
	if(index > (data.length -1) ){
		res.status(400).json({message:"field "+index+" is missing from data.",status:"error",data:null});
	}
	else if(index < 0){
		res.status(400).json({message:"field "+index+" is missing from data.",status:"error",data:null});
	}
	else{
		let fieldValue = data[index];
		checkConditionToProceed(res,rule,fieldValue)
	}
	}
}
/**function is called when the field value is String
@param {object} res - Express response object
@param {object} rule - the rule field
@param {(object|array|string)} data - the data field
*/
function evaluateForString(res,rule,data){
	let index = parseInt(rule.field);
	if(isNaN(index)){
		res.status(400).json({message:rule.field+" should be a string.",status:"error",data:null});
	}
	else{
		if(index > (data.length -1) ){
		res.status(400).json({message:"field "+index+" is missing from data.",status:"error",data:null});
	}
		else if(index < 0){
		res.status(400).json({message:"field "+index+" is missing from data.",status:"error",data:null});
	}
	else{
		let fieldValue = data.charAt(index);
		checkConditionToProceed(res,rule,fieldValue)
	}
	}
}
/**function checks if the condition is correct, then proceed with evaluation
@param {object} res - Express response object
@param {object} rule - the rule field
@param {*} fieldValue
*/
function checkConditionToProceed(res,rule,fieldValue){
			
			let isConditionCorrect = acceptConditionValue(rule.condition);
			if(isConditionCorrect){
				switch(typeCompatible(fieldValue,rule.condition_value)){
					case true : {
							validate(res,rule.condition,fieldValue,rule.condition_value,rule);
						     	break
						}
					default : {
						     	res.status(400).json({message:rule.field+" should be a "+checkDataType(rule.condition_value).toLowerCase()+".",status:"error",data:null});
						     	break
					
						}
				}	
			}
			else{
				res.status(400).json({message:"condition "+rule.condition+" is not one of the accepted conditions.",status:"error",data:null});
			}

}
/**function validates the field value against the condition value
@param {object} res - Express response object
@param {string} condition
@param {*} fieldValue
@param {*} conditionValue
@param {object} rule - the rule field
*/
function validate(res,condition,fieldValue,conditionValue,rule){
	let operator = new Operator();
	switch(condition){
		case "eq" : (function(){
			let correct = operator.equal(fieldValue,conditionValue);
			if(correct){
				res.status(200).json(giveValidationResult(rule,"successfully validated.",fieldValue,"success",false));
			}else{
				res.status(400).json(giveValidationResult(rule,"failed validation.",fieldValue,"error",true));
			}
		
		})();break;
		case "neq" : (function(){
			let correct = operator.equal(fieldValue,conditionValue);
			if(!correct){
				res.status(200).json(giveValidationResult(rule,"successfully validated.",fieldValue,"success",false));
			}else{
				res.status(400).json(giveValidationResult(rule,"failed validation.",fieldValue,"error",true));
			}
		
		})();break;
		case "gt" : (function(){
			let correct = operator.greater(fieldValue,conditionValue);
			if(correct){
				res.status(200).json(giveValidationResult(rule,"successfully validated.",fieldValue,"success",false));
			}else{
				res.status(400).json(giveValidationResult(rule,"failed validation.",fieldValue,"error",true));
			}
		
		})();break;
		case "gte" : (function(){
			let correct = operator.greaterOrEqual(fieldValue,conditionValue);
			if(correct){
				res.status(200).json(giveValidationResult(rule,"successfully validated.",fieldValue,"success",false));
			}else{
				res.status(400).json(giveValidationResult(rule,"failed validation.",fieldValue,"error",true));
			}
		
		})();break;
		case "contains" : (function(){
			let correct = operator.contains(fieldValue,conditionValue);
			if(correct){
				res.status(200).json(giveValidationResult(rule,"successfully validated.",fieldValue,"success",false));
			}else{
				res.status(400).json(giveValidationResult(rule,"failed validation.",fieldValue,"error",true));
			}
		
		})();break;
		default : res.status(400).json({message:"condition "+rule.condition+" is not one of the accepted conditions.",status:"error",data:null});
			  break;
	
	}
}
/**function gives the result of the validation
@param {object} rule - the rule field
@param {string} message
@param {*} fieldValue
@param {string} status
@param {boolean} error_status
@return {object}
*/
function giveValidationResult(rule,message,fieldValue,status,error_status){
	return {
		message : "field "+rule.field+" "+message,
		status	: status,
		data	: {
			validation:{
			error:error_status,
			field:rule.field,
			field_value:fieldValue,
			condition:rule.condition,
			condition_value:rule.condition_value
			
			}
		}
	}


}
//class will contain methods that will serve as operators for the evaluation
class Operator{
	constructor(){
	
	}
/**the equal method will evaluate operations testing for the operands equality
*@param {*} operandOne
*@param {*} operandTwo
*@return {boolean}
*/
 equal(operandOne,operandTwo){
 	if(operandOne == operandTwo)
 		return true;
 	else
 		return false;
 }
/**the greater method will evaluate operations testing for the operand that is greater
*@param {*} operandOne
*@param {*} operandTwo
*@return {boolean}
*/
greater(operandOne,operandTwo){
	if(operandOne > operandTwo)
		return true;
	else
		return false;
}
/**the greaterOrEqual method evaluates if one operand is greater or equal to another operand
*@param {*} operandOne
*@param {*} operandTwo
*@return {boolean}
*/
greaterOrEqual(operandOne,operandTwo){
	if(operandOne >= operandTwo)
		return true;
	else
		return false;
}
/**the contains method checks if the left operand contains the right operand
*@param {*} operandOne
*@param {*} operandTwo
*@return {boolean}
*/
contains(operandOne,operandTwo){
	if(operandOne.toString().indexOf(operandTwo.toString()) != -1)
		return true;
	else
		return false;	
}
}

/**
 * Module exports.
 */
module.exports = ruleValidationRouter;
