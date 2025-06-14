const { Model } = require('sequelize');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = process.env.BCRYPT_SALT || 10;

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 关联关系
    }

    validPassword(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  User.init({
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    password: {
      type: DataTypes.STRING(64),
      set(value) {
        this.setDataValue('password', bcrypt.hashSync(value, SALT_ROUNDS));
      }
    }
  }, {
    sequelize,
    modelName: 'User',
  });

  return User;
};