
// // Model
const userModel = require('../model/userModel');
const jwt = require('jsonwebtoken')






//----------------------------------------vallidationPassword-----------------------



const isValidpass = function (value) { 

    if (typeof value == 'undefined' || value == 'null')
        return false
    
    if (nameCheck == false) {
        return false
    }
    if (typeof value == 'string' && value.trim().length >= 1)return true

}



const createUser = async function (req, res) {
    try {
        let data = req.body
        let { title, name, email, phone, password } = data


        if (!title) return res.status(400).send({ status: false, msg: "title is mandatory" })
        if ((title !== "Mr" && title !== "Mrs" && title !== "Miss")) return res.status(400).send({ status: false, msg: "give title only ['Mr'/ 'Mrs'/'Miss']" });

        if (!name || !email || !phone || !password) return res.status(400).send({ status: false, msg: "Mandatory fields are required" })

        const nameValidation = (/^[a-zA-Z]+([\s][a-zA-Z]+)*$/.test(name));
        const validateEmail = (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email));
        const validatePassword = (/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/.test(password))
        const validatePhone = ((/^(\+\d{1,3}[- ]?)?\d{10}$/.test(phone)))


        if (typeof name !== "string" || !nameValidation)
            return res.status(400).send({ status: false, msg: "please enter a valid name" })

        if (!validatePhone) return res.status(400).send({ status: false, msg: "Please enter valid Phone Number" })
        if (!validateEmail) return res.status(400).send({ status: false, msg: "Email is invalid, Please check your Email address" });
        if (!validatePassword) return res.status(400).send({ status: false, msg: "use a strong password at least =>  one special, one Uppercase, one lowercase (character) one numericValue and password must be eight characters or longer)" });


        let uniqueData = await userModel.findOne({ $or : {phone: phone , email: email } })


        if (!uniqueData) return res.status(400).send({ status: false, msg: "Mobile Numner or Email is already exist" })
     

        let saveData = await userModel.create(data)
        res.status(201).send({ status: true, msg: saveData })
    } catch (error) {
        res.status(500).send({ status: false, msg: error.message });
    }
}


const loginUser = async function (req, res) {
    try {
        const { email, password } = req.body

        const validateEmail = (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email));
        const validatePassword = (/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/.test(password))


        if (!email || !password) {
            return res.status(400).send({ status: false, msg: "mail id or password is required" })
        }

        if(!validateEmail) return res.status(400).send({ status: false, msg: "Please provide a valid Email." })

        if (!validatePassword) {
            return res.status(400).send({ status: false, msg: "Please provide a valid password." })
        }
        const userData = await userModel.findOne({ email: email, password: password })
        if (!userData) {
            return res.status(400).send({ status: false, msg: "incorrect email or password" })
        }
        const token = jwt.sign({ userId: userData._id.toString() }, "projectsecretcode" , { expiresIn: '1h' })
        return res.status(200).send({ status: true, msg: "succesfull logged in", token: token })
    }
    catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}


module.exports = {createUser , loginUser}