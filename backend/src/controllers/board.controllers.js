const Board = require("../models/Board");
const User = require("../models/User")

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
        const board = await Board.findOne({ _id:req.params.id, owner: req.user.id})
        .populate('owner','-password -updatedAt -createdAt')
        .populate('participants','-password -updatedAt -createdAt');
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

exports.addParticipant = async (req, res) => {
    try {
        const { boardId } = req.params;
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({
                success: false,
                message: 'Board not found'
            });
        }
        if (board.owner.toString() === user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Owner is already a member'
            });
        }

        const alreadyParticipant = board.participants.some(
            id => id.toString() === user._id.toString()
        );
        
        if (alreadyParticipant) {
            return res.status(400).json({
                success: false,
                message: 'User already added'
            });
        }

        if (board.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only board owner can add participants'
            });
        }

        board.participants.push(user._id);
        await board.save();

        const populatedBoard = await Board.findById(board._id)
            .populate('owner', '-password -updatedAt -createdAt')
            .populate('participants', '-password -updatedAt -createdAt');
    
        return res.status(200).json({
            success: true,
            message: 'Participant added successfully',
            board: populatedBoard
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};