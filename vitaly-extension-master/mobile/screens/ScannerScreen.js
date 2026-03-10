import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.7;

export default function ScannerScreen({ navigation }) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [torch, setTorch] = useState(false);

  const handleBarCodeScanned = useCallback(async ({ type, data }) => {
    if (scanning) return;
    
    setScanning(true);
    
    try {
      // Determine barcode type
      let barcodeType = 'unknown';
      if (type === 'ean13' || type === 'ean8') barcodeType = 'ean';
      else if (type === 'upce' || type === 'upca') barcodeType = 'upc';
      
      // Search by barcode
      const response = await api.post('/search/barcode', {
        barcode: data,
        type: barcodeType
      });
      
      if (response.data.product) {
        navigation.navigate('ProductDetail', { 
          product: response.data.product 
        });
      } else {
        Alert.alert(
          'Product Not Found',
          'No products found for this barcode. Try searching by name instead.',
          [{ text: 'OK', onPress: () => setScanning(false) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search product. Please try again.');
      setScanning(false);
    }
  }, [scanning, navigation]);

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="camera-outline" size={64} color={theme.colors.primary} style={{ alignSelf: 'center' }} />
        <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
          Camera Access Required
        </Text>
        <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
          We need camera access to scan barcodes and find products on AliExpress.
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upce', 'upca', 'qr'],
        }}
        onBarcodeScanned={handleBarCodeScanned}
        enableTorch={torch}
      >
        {/* Scanner Overlay */}
        <View style={styles.overlay}>
          {/* Top Mask */}
          <View style={[styles.mask, { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          
          {/* Middle Row */}
          <View style={styles.middleRow}>
            {/* Left Mask */}
            <View style={[styles.mask, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
            
            {/* Scanner Frame */}
            <View style={[styles.scannerFrame, { width: SCANNER_SIZE, height: SCANNER_SIZE }]}>
              {/* Corner Markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              
              {/* Scan Line Animation */}
              <View style={styles.scanLine} />
            </View>
            
            {/* Right Mask */}
            <View style={[styles.mask, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          </View>
          
          {/* Bottom Mask */}
          <View style={[styles.mask, { flex: 1.5, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.instructionText}>
              Position barcode within the frame
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setTorch(!torch)}
          >
            <Ionicons 
              name={torch ? 'flash' : 'flash-outline'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="keypad-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </CameraView>
      
      {scanning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching AliExpress...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mask: {
    width: '100%',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCANNER_SIZE,
  },
  scannerFrame: {
    borderWidth: 0,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00d4ff',
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#0f1419',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
