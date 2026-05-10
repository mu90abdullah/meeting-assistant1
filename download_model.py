import logging
import os
os.environ['KMP_DUPLICATE_LIB_OK']='True'

print("="*60)
print("  🚀 جاري تحميل نموذج Whisper (Small) للمعالجة المحلية")
print("  حجم النموذج: حوالي 483 ميجابايت")
print("  يرجى الانتظار، قد يستغرق الأمر بضع دقائق حسب سرعة الإنترنت...")
print("="*60)

logging.basicConfig(level=logging.INFO)

try:
    from faster_whisper import WhisperModel
    # This will trigger the download and save it to the HuggingFace cache
    model = WhisperModel("small", device="cpu", compute_type="int8")
    print("\n" + "="*60)
    print("  ✅ اكتمل التحميل بنجاح!")
    print("  النموذج الآن جاهز للاستخدام. يمكنك تشغيل الموقع والمحاولة مجدداً.")
    print("="*60)
except Exception as e:
    print(f"\n❌ حدث خطأ أثناء التحميل: {e}")
