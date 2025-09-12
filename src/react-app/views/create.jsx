import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NavBar, Form, Button, ImageUploader,
  Toast, SafeArea, TextArea
} from "antd-mobile";
import {
  LeftOutline,
} from 'antd-mobile-icons';
import { useAuth } from "../utils/authContext";
import { recordsApi } from "../utils/api";
import { commonUploadFile } from "../utils";
import styles from './create.module.css';

const Create = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 处理图片上传
  const handleImageUpload = async (file) => {
    console.log('file🧐', file);
    try {
      const result = await commonUploadFile(file);
      console.log('result🧐', result);
      return result;
    } catch (error) {
      console.error('图片上传失败:', error);
      Toast.show({
        content: '图片上传失败',
        position: 'center',
      });
      return null;
    }
  };

  // 提交表单
  const handleSubmit = async (values) => {
    console.log('values🧐', values);
    if (!values.content) {
      Toast.show({
        content: '请输入内容',
        position: 'center',
      });
      return;
    }
    const images = values.images || [];

    setLoading(true);
    try {
      const recordData = {
        creator_id: user?.id || 1, // 使用当前用户ID
        content_text: values.content || '',
        content_media: images.length > 0 ? JSON.stringify(images) : null,
        extra_data: {
          avatar: user?.avatar || '',
          likes: [],
          comments: [],
        }
      };

      await recordsApi.createRecord(recordData);

      Toast.show({
        content: '发布成功',
        position: 'center',
        icon: 'success',
      });

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        navigate('/');
      }, 600);

    } catch (error) {
      console.error('发布失败:', error);
      Toast.show({
        content: '发布失败，请重试',
        position: 'center',
      });
    } finally {
      setLoading(false);
    }
  };

  function beforeUpload(file) {
    if (file.size > 20 * 1024 * 1024) {
      Toast.show('请选择小于 20M 的文件');
      return null
    }
    return file
  }

  return (
    <div className={styles.createContainer}>
      <SafeArea position='top' />

      {/* 导航栏 */}
      <NavBar
        onBack={() => navigate(-1)}
        backArrow={<LeftOutline />}
        right={
          <Button
            size='small'
            color='primary'
            loading={loading}
            onClick={() => form.submit()}
          >
            发布
          </Button>
        }
      >
        新建瞬间
      </NavBar>

      {/* 表单内容 */}
      <div className={styles.content}>
        <Form
          form={form}
          onFinish={handleSubmit}
          layout='vertical'
          className={styles.form}
        >
          {/* 用户信息 */}
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              <img
                src={user?.avatar || 'https://via.placeholder.com/40x40/4A90E2/FFFFFF?text=U'}
                alt="avatar"
              />
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.name || '用户'}</div>
              <div className={styles.userRole}>{user?.role === 'admin' ? '管理员' : '普通用户'}</div>
            </div>
          </div>

          {/* 内容输入 */}
          <Form.Item name="content" className={styles.contentInput}>
            <TextArea
              placeholder="分享你的瞬间..."
              rows={6}
              maxLength={500}
              showCount
              autoSize={{ minRows: 4, maxRows: 8 }}
            />
          </Form.Item>

          {/* 图片上传 */}
          <Form.Item name="images" className={styles.imageSection}>
            <ImageUploader
              upload={handleImageUpload}
              maxCount={9}
              className={styles.imageUploader}
              accept="image/*,video/*"
              beforeUpload={beforeUpload}
            />
          </Form.Item>
        </Form>
      </div>
      <SafeArea position='bottom' />
    </div>
  );
};

export default Create;