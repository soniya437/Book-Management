const moment = require('moment')
const mongoose = require('mongoose')
const objectId = mongoose.Types.ObjectId


//-------------------------*** Models import ***-----------------//

const bookModel = require("../model/bookModel")
const userModel = require('../model/userModel')
const reviewModel = require('../model/reviewModel')

//------------------------*** Improtant Regex ***----------------//
const  isbnRegex =   (/^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/)
const excerptRegex = (/^([A-Za-z ]){3,}$/)
const releasedAtRegex = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/


//-------------------*** Function for valid entry ***--------------------//
const {isValidEntry} = require('../validator/validator')


//--------------------------------------------------*** Create Book ***-------------------------------------------------------------------//
const createBook = async function (req, res) {
    try {
        let data = req.body;
        let {title,  userId, category, subcategory,ISBN ,excerpt , releasedAt } = data

        if (Object.keys(data).length == 0) return res.status(400).send({ status: false, message: "Give some data for book" })
        

        if(!isValidEntry(title)) return res.status(400).send({status : false , message : "Title is not given."})
        if(!isValidEntry(userId) || !objectId.isValid(userId)) return res.status(400).send({status : false , message : "UserId is not given or Invalid. "})
        if(!isValidEntry(category)) return res.status(400).send({status : false , message : "Category is not given."})
        if(!isValidEntry(subcategory)) return res.status(400).send({status : false , message : "Subcategory is not given."})
        
        if(!isValidEntry(excerpt)  || !excerptRegex.test(excerpt)) return res.status(400).send({status : false , message : "Excerpt is not given or Not Invalid (Excerpt only contain Alphabet and space.)."})
        if(!isValidEntry(ISBN) || !isbnRegex.test(ISBN)) return res.status(400).send({status : false , message : "ISBN is not given or Not Invalid."})


        // // // For checking date in releasedAt value.
        if(!releasedAt){   
            data.releasedAt =  moment() .format('YYYY-MM-DD')
        }else{
            if(!releasedAtRegex.test(releasedAt)) return res.status(400).send({status : false , message : "Please provide valid releasedAt value in form --> (2022-11-27) or skip"})
        }

        if(data.isDeleted == true){
            data.deletedAt = Date.now()
        }


        let userCheck = await userModel.findOne({userId : userId})
        if(!userCheck) return res.status(400).send({status: false, message: "Invalid UserId , user not exist in DB"})


        // // // In next line we are checking user is autherized or not.
        const tokenUserId =  req.tokenUserId
        if(tokenUserId !== userId) return res.status(403).send({status: false, message: "Forbidden , Not Authorized "})


        let allreadyBookTitle = await bookModel.findOne({title : title})
        if(allreadyBookTitle) return res.status(400).send({status: false, message: "Title of book , already present."})

        let allreadyBookISBN = await bookModel.findOne({ISBN : ISBN})
        if(allreadyBookISBN) return res.status(400).send({status: false, message: "ISBN, already present."})

        let saveData = await bookModel.create(data)
        return res.status(201).send({ status: true,message: 'Success', data: saveData })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
};

//-------------------------------------*** Get All Book ***----------------------------------------------------------------------------//
const getBooks = async function (req, res) {

    try {

        let query = req.query

        for (let key in query) {
            if (key != "userId" && key !== "category" && key !== "subcategory") return res.status(400).send({ status: false, message: `Invalid key:-${key} in query params only userId , category , subcategory is allowed` })
        }

        
        let findObj = { isDeleted: false , ...query }

        // // Below line for trim() and validate userId value. 
        let userId = req.query.userId
        if(userId){
            userId= userId.trim()
            if(!objectId.isValid(userId)) return res.status(400).send({status : false , message : "Given userId is invalid."})
            findObj.userId = userId
        }

        
        let allBook = await bookModel.find(findObj).select({ _id: 1, title: 1, excerpt: 1, userId: 1, category: 1,  reviews: 1 , releasedAt : 1 }).sort({ title: 1 })
        
        if (allBook.length <= 0) return res.status(404).send({ status: false, message: "No book found (With given query)" })


        res.status(200).send({status: true , message: 'Books list' , data: allBook})

    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
}



//------------------------------*** Get Book by BookID ***--------------------------------------------------------------------------//
const getBooksById = async function (req, res) {
    try {
        let bookId = req.params.bookId
        if (!objectId.isValid(bookId)) return res.status(400).send({ status: false, message: "Please give a Valid bookId " })

        let allBooks = await bookModel.findById(bookId).select({__v : 0}).lean()
        if(!allBooks) return res.status(404).send({ status: false, message: "Books not found with this Id" })
     
        if (allBooks.isDeleted == true) return res.status(404).send({ status: false, message: "Book is already deleted" })

        let allReviewOfBookId = await reviewModel.find({bookId : bookId , isDeleted : false })

        allBooks.reviewData = allReviewOfBookId      // // Creating one more attribute in mongoose object After using lean()

        res.status(200).send({ status: true , message :"Success" , data: allBooks })
    }
    catch (err) {
        res.status(500).send({ status: "error", message: err.message })
    }
}




//-------------------------------*** Update Book by BookID ***------------------------------------------------------------------//
const updateBookById = async function (req, res) {
    try {
        let bookId = req.params.bookId
        if (!objectId.isValid(bookId)) return res.status(400).send({ status: false, message: "Please give a Valid bookId " })

        
        let checkId = await bookModel.findById(bookId)
        if (!checkId) return res.status(404).send({ status: false, message: "No Books found" })
        if (checkId.isDeleted == true) return res.status(404).send({ status: false, message: "Book is already deleted" })

        let details = req.body
        if (Object.keys(details).length == 0) return res.status(400).send({ status: false, message: "Please give Details in body" })

        let { title , excerpt , ISBN , releasedAt } = details

        if(excerpt){
            if(!excerptRegex.test(excerpt)) return res.status(400).send({status : false , message : " Invalid Excerpt (Excerpt only contain Alphabet and space.)."})
        }

        if(ISBN){
            if(!isbnRegex.test(ISBN)) return res.status(400).send({status : false , message : " Invalid ISBN."})
        }

        if(releasedAt){   
            if(!releasedAtRegex.test(releasedAt)) return res.status(400).send({status : false , message : "Please provide valid releasedAt value in form --> (2022-11-27)"})
        }

        let alreadyData = await bookModel.findOne({$or : [ {title : title} , {excerpt : excerpt} , {ISBN : ISBN} ]})
        if(alreadyData) return res.status(400).send({status : false , message : "Title , excerpt , ISBN is already present in DB"})

        const updatedBook = await bookModel.findByIdAndUpdate(
            { _id: bookId },
            { $set: { title: title, excerpt: excerpt, ISBN: ISBN , releasedAt : releasedAt } },
            { new: true }
        )

        return res.status(200).send({ status: true , message: 'Success', data: updatedBook })
    }
    catch (err) {
        res.status(500).send({ status: "error", message: err.message })
    }
}


//-----------------------------*** Delete Book by BookID ***-----------------------------------------------------------------------------//
const deleteBookById = async function (req, res) {
    try {
        let bookId = req.params.bookId
        if (!objectId.isValid(bookId)) return res.status(400).send({ status: false, message: "Please give a Valid bookId " })

        let checkBookId = await bookModel.findById(bookId)

        if(!checkBookId) return res.status(404).send({status : false , message : "Data not found with given bookId"})

        if (checkBookId.isDeleted === true) return  res.status(404).send({ status: false, message: "Book is already deleted" })

        let deleteBook = await bookModel.findByIdAndUpdate(bookId , { $set: { isDeleted: true, deletedAt: Date.now() } }, { new: true })
        return res.status(200).send({ status: true, message: 'Success', data: deleteBook })
    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
};



module.exports = { createBook, getBooks , getBooksById , deleteBookById , updateBookById }