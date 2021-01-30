//returns my details
function baseRouter(req,res){
	res.status(200).json(details);
}

//object contains my details as requested
let details = {
	message:"My Rule-Validation API",
	status: "success",
	data: {
    	name: "Quadri Naheem Adekunmi",
    	github: "@naheem3410",
    	email: "naheemquadri3410@gmail.com",
    	mobile: "08134103142"
  }
};

/**
 * Module exports.
 */
module.exports = baseRouter;

