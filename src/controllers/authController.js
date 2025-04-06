const db = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where } = require("sequelize");
const User = db.User;

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if(!username || !password){
        return res.status(400).json({error: 'Hay nhap tai khoan va mat khau'});
    }
    const user = await User.findOne({where: {username}});
    if(!user){
        return res.status(401).json({error: 'Tai khoan khong ton tai'});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        return res.status(401).json({error: 'Mat khau sai'});
    }

    //JWT
    const payload = {
        id: user.id,
        role: user.role,
    };
    if(user.role === 'student' && user.studentId){
        payload.studentId = user.studentId;
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'});

    //tra thong tin user
    const responseUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
    };
    if(user.role === 'student'){
        responseUser.studentId = user.studentId;
    }
    
    res.status(200).json({message: 'Dang nhap thanh cong', user: responseUser, token});

  } catch (error) {
    console.log("Dang nhap that bai", error);
    res.status(500).json({error: 'Server loi!'});
  }
};
