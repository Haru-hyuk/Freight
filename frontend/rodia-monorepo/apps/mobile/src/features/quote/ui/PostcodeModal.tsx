import React from 'react';
import { Modal, StyleSheet, View, Pressable } from 'react-native';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui/kit/AppText';

interface PostcodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelected: (data: { address: string; zonecode: string; bname?: string; buildingName?: string }) => void;
}

export function PostcodeModal({ visible, onClose, onSelected }: PostcodeModalProps) {
  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no">
      <style>
        /* [중요] body와 html의 스크롤을 막아 전체 화면 밀림 방지 */
        body, html { 
          width: 100%; 
          height: 100%; 
          margin: 0; 
          padding: 0; 
          background: #ffffff; 
          overflow: hidden; 
        }
        /* [중요] 실제 컨텐츠가 들어가는 layer에서만 스크롤 허용 */
        #layer { 
          width: 100%; 
          height: 100%; 
          overflow-y: auto; 
          -webkit-overflow-scrolling: touch; 
        }
      </style>
    </head>
    <body>
      <div id="layer"></div>
      <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
      <script>
        new daum.Postcode({
          oncomplete: function(data) {
            var fullAddress = data.roadAddress;
            var extraAddress = '';

            if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
              extraAddress += data.bname;
            }
            if (data.buildingName !== '' && data.apartment === 'Y') {
              extraAddress += (extraAddress !== '' ? ', ' + data.buildingName : data.buildingName);
            }
            if (fullAddress === '') {
              fullAddress = data.jibunAddress;
            }
            
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          },
          width: '100%',
          height: '100%',
          focusInput: false, // [선택] 입력창에 포커스 유지 여부 (스크롤 튀는 현상 방지에 도움 될 수 있음)
        }).embed(document.getElementById('layer'));
      </script>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText style={styles.title}>주소 검색</AppText>
          <Pressable onPress={onClose} hitSlop={15} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#333" />
          </Pressable>
        </View>
        
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://postcode.map.daum.net/' }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // [중요] 네이티브 스크롤 비활성화 (HTML 내부 스크롤만 사용)
          scrollEnabled={false} 
          // [중요] 안드로이드 오버스크롤 효과 제거
          overScrollMode="never"
          // 키보드 올라올 때 뷰 조정 방식 설정 (안드로이드)
          androidLayerType="hardware"
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              
              let fullAddress = data.roadAddress || data.jibunAddress;
              let extraAddress = '';

              if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
                extraAddress += data.bname;
              }
              if (data.buildingName !== '' && data.apartment === 'Y') {
                extraAddress += (extraAddress !== '' ? ', ' + data.buildingName : data.buildingName);
              }

              const finalAddr = fullAddress + (extraAddress !== '' ? ` (${extraAddress})` : '');
              
              onSelected({
                address: finalAddr,
                zonecode: data.zonecode,
              });
              
              onClose();
            } catch (error) {
              console.error("Address parsing error:", error);
            }
          }}
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    position: 'relative',
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
  }
});
