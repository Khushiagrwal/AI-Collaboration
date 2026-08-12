const User=require("../models/User")
const bcrypt=require("bcrypt")
const jwt= require("jsonwebtoken")

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if(!name || !email || !password){
        return res.status(400).json({
            message: "All fields are required",
            name:name,
            email:email,
            password:password
        });
    }
    const existingUser= await User.findOne({email})
    if(existingUser)
    {
        return res.status(400).json({message:"Already Register User"})
    }
    const hashPassword= await bcrypt.hash(password,10)
    const user=await User.create({name,email,password:hashPassword})
    const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

    res.status(201).json({success:true,data:user,token:token})
     
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
}
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if(!user){
        return res.status(400).json({message:"User not found"})
    }

    const isMatch = await bcrypt.compare(password,user.password);
    if (!isMatch) {
        return res.status(401).json({
            message: "Invalid password"
        });
    }else{
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({success:true,data:user,token:token})
    }

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};