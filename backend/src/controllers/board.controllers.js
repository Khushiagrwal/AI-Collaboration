const Board = require("../models/Board");

exports.getBoards = async(req,res)=>{
    try{
        const boards = await Board.find({  owner: req.user.id});
        res.json({success: true,boards});
    }catch(err)
    {
        res.status(500).json({
        message: err.message
        });
    }
}

exports.getBoard = async(req,res)=>{
    try{
        const board = await Board.findOne({ _id:req.params.id, owner: req.user.id});
        if(!board)
            return res.status(404).json({message:"Board not exist"});
        res.json({success: true,board});
    }catch(err)
    {
        res.status(500).json({
        message: err.message
        });
    }
}

exports.createBoard = async(req,res)=>{
    try{
        
        const title=req.body.title;
        if (!title || title.trim() === "")
            return res.status(404).json({message:"Required Board Title"});
        const board=await Board.create({title:title,owner:req.user.id});
        return res.status(200).json({success:true,message:"Board Create Successfully",board})
    }catch(err)
    {
        res.status(500).json({
        message: err.message
        });
    }
}

exports.updateBoard = async(req,res)=>{
    try{
        const board = await Board.findOne({ _id:req.params.id,owner:req.user.id})
        if(!board)
            return res.status(404).json({message:"Board not exist"});
        board.title = req.body.title;
        await board.save();
        res.json({success: true,board,message:"Update Board Successfully"});
    }catch(err)
    {
        res.status(500).json({
        message: err.message
        });
    }
}

exports.deleteBoard = async(req,res)=>{
    try{
        const board= await Board.findOne({_id:req.params.id,owner:req.user.id})
        if(!board)
            return res.status(404).json({message:"Board not exist"});
        await board.deleteOne()
        res.json({success: true,board,message:"Delete Board Successfully"});
    }catch(err)
    {
        res.status(500).json({
        message: err.message
        });
    }
}