import jwt from 'jsonwebtoken';

const AuthRoute = (req,res,next)=>{
    const token = req.header("Authorization");
    if(!token){
        res.json({"message": "token not found "});
    }
    try{
        const decoded = jwt.verify(token, process.env.SECRET_KEY); 
        req.user = decoded.jntuno;
        //here the admin jntuno is decoded from jwt token
        next();
    }catch(err){
        res.json({"error" : "token not verified"}); 
    }
} 
export default AuthRoute; 