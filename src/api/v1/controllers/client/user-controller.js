const createError = require('http-errors');
const UserModel = require('@v1/models/user-model');
const OtpModule = require('@v1/modules/otp-module');

class UserController {
  static async forgotPassword(req, res, next) {
    try {
      let { email } = req.body;
      let user = await UserModel.findOne({
        email: email.trim().toLowerCase(),
      });
      if (!user) return res.status(404).send({ error: 'user-not-found-by-email' });

      let generator = await OtpModule.generatorForgotPassword({
        email: email.trim().toLowerCase(),
        type: 'forgot_password',
      });
      if (generator.status === 'new') {
        let emailSend = new EmailModule('forgot_password', 'vi', email);

        await emailSend.send_email({
          fullName: user.fullName,
          email: user.email,
          codeForgotPassword: generator.otp.code,
        });
      }

      return res.status(200).send({ message: 'forgot_password-success' });
    } catch (error) {
      console.error(error);
      return next(createError.BadRequest(error.message));
    }
  }

  static async resetPassword(req, res, next) {
    try {
      let { password, code, email } = req.body;
      let user = await UserModel.findOne({
        email,
      });
      if (!user) return res.status(404).send({ error: 'user-not-found-by-email' });

      let status = await OtpModule.verify({ code, type: 'forgot_password', email });
      if (!status) return res.status(422).send({ error: 'code-not-verify' });

      user.updatePassword = password;
      await user.save();
      return res.status(200).send({ message: 'reset-password-success' });
    } catch (error) {
      console.error(error);
      return next(createError.BadRequest(error.message));
    }
  }

  static async list(req, res, next) {
    try {
      let { limit, page, keyword } = req.query;
      if (!limit) limit = 20;
      if (!page) page = 1;

      let skip = limit * page - limit;
      let options = {};
      if (keyword) options.fullName = new RegExp(keyword, 'img');

      let list = await UserModel.find(options)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select('-password');
      let count = await UserModel.countDocuments(options);

      return res.status(200).send({ count, list });
    } catch (error) {
      console.error(error);
      return next(createError.BadRequest(error.message));
    }
  }
}

module.exports = UserController;
