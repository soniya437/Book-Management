const reviewModel = require('../model/reviewModel')
const bookModel = require('../model/bookModel')

const mongoose = require('mongoose')
const objectId = mongoose.Types.ObjectId


const nameValidation = (/^[a-zA-Z ]+([\s][a-zA-Z ]+)*$/);


//------------------------------*** Post Review  ***--------------------------------------------------------------------------//

const postReview = async function (req, res) {

    try {
        let bookIdInParams = req.params.bookId

        let body = req.body
        body.reviewedAt = Date.now()

        body.bookId = bookIdInParams

        if (!objectId.isValid(bookIdInParams)) return res.status(400).send({ status: false, message: "Please give a Valid bookId in path params" })

        let bookPresent = await bookModel.findById(bookIdInParams)

        if (!bookPresent) return res.status(404).send({ status: false, message: "No Book found with given bookId." })

        if (bookPresent.isDeleted === true) return res.status(404).send({ status: false, message: "Book is deleted you can't add review." })

        let { reviewedBy, rating } = body

        if (!nameValidation.test(reviewedBy)) return res.status(400).send({ status: false, message: "Please give right name in reviewedBy,ex->'John cena' " })

        if (!rating) return res.status(400).send({ status: false, message: "Please give rating(mandatory) for this book in b/t 1 to 5" })

        if( typeof rating !== Number) return res.status(400).send({ status: false, message: "Rating should be number." })

        if (rating < 1 || rating > 5) return res.status(400).send({ status: false, message: "Please give a rating in b/w 1 to 5" })

        let createReview = await reviewModel.create(body)

        let incBookReview = await bookModel.findByIdAndUpdate( 
            bookIdInParams ,
            { $inc: { reviews: 1 }, },
            { new: true }
        ).select({ __v: 0 }).lean()

        incBookReview.reviewData = createReview      // // Creating one more attribute in mongoose object After using lean()

        res.status(201).send({ status: true, message: "Review created.", data: incBookReview })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });

    }

}

//------------------------------*** Update Review By reviewId  ***--------------------------------------------------------------------------//

const updateReview = async function (req, res) {
    try {
        const booksId = req.params.bookId;
        const reviewId = req.params.reviewId;

        if (!objectId.isValid(booksId)) return res.status(400).send({ status: false, message: "Please give a Valid bookId in path params" })
        if (!objectId.isValid(reviewId)) return res.status(400).send({ status: false, message: "Please give a Valid reviewId in path params" })

        const bookData = await bookModel.findOne({ _id: booksId }).select({ __v: 0 }).lean()
        if (!bookData) return res.status(404).send({ status: false, message: "Book not found" })

        if (bookData.isDeleted == true) return res.status(404).send({ status: false, message: "This book is no longer Exists" })

        const reviewData = await reviewModel.findOne({ _id: reviewId }).select({ __v: 0 , createdAt:0, updatedAt:0})
        if (!reviewData) return res.status(404).send({ status: false, message: "No review found with this reviewId." });
        if(reviewData.isDeleted === true) return res.status(404).send({ status: false, message: "Review is deleted you can't update that." });


        let update = req.body;
        let {review , rating , reviewedBy} = update

        if (Object.keys(update).length > 0) {
            if (review) {
                reviewData.review = review;
            }
            if (rating || rating == 0) {
                if (rating < 1 || rating > 5) return res.status(400).send({ status: false, message: "Please give a rating in b/w 1 to 5" })
                reviewData.rating = rating;
            }
            if (reviewedBy) {
                if (!nameValidation.test(reviewedBy)) return res.status(400).send({ status: false, message: "Please give right name in reviewedBy,ex->'John cena' " })
                reviewData.reviewedBy = reviewedBy;
            }
            reviewData.save();
        }
        else {
            return res.status(400).send({ status: false, message: "Please provide some data that you want to update" });
        }

        bookData.reviewData = reviewData    // // Creating one more attribute in mongoose object After using lean()


        return res.status(200).send({ status: true, message: "SuccessFully Updated", data: bookData });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};

//------------------------------*** Delete Review By reviewId ***--------------------------------------------------------------------------//

const deleteReview = async function (req, res) {
    try {

        const bookId = req.params.bookId
        const reviewId = req.params.reviewId

        if (!objectId.isValid(bookId)) return res.status(400).send({ status: false, message: "Please give a Valid bookId in path params" })

        const bookData = await bookModel.findById(bookId )

        if (!bookData) return res.status(404).send({ status: false, message: `No Book data found by this bookId :- ${bookId}`});
        if(bookData.isDeleted== true) return res.status(404).send({  status: false , message:"Book is already deleted"})

        if (!objectId.isValid(reviewId)) return res.status(400).send({ status: false, message: "Please give a Valid reviewId in path params" })

        const reviewbyReviewId = await reviewModel.findById(reviewId)

        if (!reviewbyReviewId) return res.status(404).send({ status: false, message: `No review found by this reviewId :- ${reviewId}` });
        if(reviewbyReviewId.isDeleted== true) return res.status(404).send({ status: false , message:"Review is already deleted"})        

        if (reviewbyReviewId.bookId != bookId) return res.status(400).send({ status: false, message: "Review is not from this book" })

        const markReviewDelete = await reviewModel.findByIdAndUpdate(reviewId, { $set: { isDeleted: true } }, { new: true })

        const updateReviewCount = await bookModel.findByIdAndUpdate(bookId, { $inc: { reviews: -1 } }, { new: true }).lean()

        updateReviewCount. reviewData = markReviewDelete     // // Creating one more attribute in mongoose object After using lean()

        return res.status(200).send({ status: true, message: "Review Deleted Successfully",updateReviewCount })
    }

    catch (error) {
        return res.status(500).send({ error: error.message })
    }
}




module.exports = { postReview, updateReview, deleteReview }