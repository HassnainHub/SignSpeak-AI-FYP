import tensorflow as tf

def build_model():
    base_model = tf.keras.applications.MobileNetV2(
        weights=None, include_top=False, pooling='avg',
        input_shape=(224, 224, 3)
    )
    base_model._name = 'mobilenetv2_1.00_224'
    
    inputs = tf.keras.Input(shape=(16, 224, 224, 3), name='input_layer_1')
    x = tf.keras.layers.TimeDistributed(base_model, name='time_distributed')(inputs)
    x = tf.keras.layers.TimeDistributed(tf.keras.layers.Dropout(0.25), name='time_distributed_2')(x)
    x = tf.keras.layers.Bidirectional(
        tf.keras.layers.LSTM(128, return_sequences=False, dropout=0.25, recurrent_dropout=0.2),
        name='bidirectional'
    )(x)
    x = tf.keras.layers.BatchNormalization(momentum=0.99, name='batch_normalization')(x)
    x = tf.keras.layers.Dense(256, activation='relu', kernel_regularizer=tf.keras.regularizers.L2(0.0001), name='dense')(x)
    x = tf.keras.layers.Dropout(0.4, name='dropout_1')(x)
    outputs = tf.keras.layers.Dense(50, activation='softmax', name='dense_1')(x)
    
    model = tf.keras.Model(inputs=inputs, outputs=outputs)
    return model

model = build_model()
model.load_weights('SignSpeak_Model_Final.keras')
print("WEIGHTS LOADED SUCCESSFULLY")
