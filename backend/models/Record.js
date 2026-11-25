import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  kind: {type:String, required:true},
  payload: {type:mongoose.Schema.Types.Mixed, required:true},
  createdAt: {type:Date, default:Date.now}
});
export default mongoose.model('Record', schema);
